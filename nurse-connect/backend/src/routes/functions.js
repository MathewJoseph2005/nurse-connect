import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  ActivityLog,
  Admin,
  Department,
  Division,
  HeadNurse,
  Nurse,
  Notification,
  Schedule,
  ShiftSwapRequest,
  User,
  UserRole,
  NurseRemoval,
} from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBalancedScheduleEntries, generateScheduleWithGroq } from "../lib/scheduling.js";

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function validatePasswordConfirmation(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

router.post("/create-user", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { email, password, confirmPassword, role, name, username, department_id, division_id } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const normalizedUsername = String(username || "").trim();
    const allowedRoles = new Set(["head_nurse", "admin"]);

    if (!normalizedEmail || !password || !confirmPassword || !normalizedName || !normalizedUsername || !allowedRoles.has(role)) {
      return res.status(400).json({ error: "Invalid create-user payload" });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const passwordValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const exists = await User.findOne({ email: normalizedEmail }).lean();
    if (exists) return res.status(400).json({ error: "User already exists" });

    // For head_nurse role, ensure only one head nurse per department
    if (role === "head_nurse" && department_id) {
      const existingHeadNurse = await HeadNurse.findOne({ department_id }).lean();
      if (existingHeadNurse) {
        return res.status(400).json({ error: "A head nurse already exists for this department" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role,
      name: normalizedName,
      username: normalizedUsername,
    });

    await UserRole.create({ user_id: user._id, role });
    if (role === "head_nurse") {
      await HeadNurse.create({ user_id: user._id, name: normalizedName, username: normalizedUsername, department_id: department_id || null, division_id: division_id || null });
    }
    if (role === "admin") {
      await Admin.create({ user_id: user._id, name: normalizedName, username: normalizedUsername });
    }

    return res.json({ success: true, user_id: user._id.toString() });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to create user" });
  }
});

router.post("/generate-schedule", requireAuth, requireRole("admin", "head_nurse"), async (req, res) => {
  try {
    const { week_number, year, department_id, force_assign_remaining = false, shift_pattern = "12_hours", max_shifts_per_week = 3 } = req.body;
    
    // Determine which departments to schedule for
    let targetDepartments;
    
    if (req.authUser.role === "head_nurse") {
      // Head nurse can only generate schedules for their own department.
      const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
      if (!headNurse || !headNurse.department_id) {
        return res.status(400).json({
          code: "HEAD_NURSE_DEPARTMENT_MISSING",
          error: "Your head nurse account is not linked to a department. Please contact admin.",
        });
      }

      // If no department is provided, default to the head nurse's own department.
      const requestedDepartmentId = department_id || headNurse.department_id;
      if (!headNurse.department_id.equals(requestedDepartmentId)) {
        return res.status(403).json({ error: "You can only generate schedules for your own department" });
      }
      targetDepartments = [{ _id: requestedDepartmentId }];
    } else if (req.authUser.role === "admin") {
      // Admin can generate for specific department or all departments if not specified
      if (department_id) {
        targetDepartments = [{ _id: department_id }];
      } else {
        targetDepartments = await Department.find({}).lean();
      }
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (targetDepartments.length === 0) {
      return res.status(400).json({ error: "No departments found" });
    }

    const entries = [];
    const allDivisions = await Division.find({}).select("_id name").lean();
    const insufficiencyDetails = [];
    const monday = new Date(year, 0, 4);
    const dayOfWeek = monday.getDay() || 7;
    monday.setDate(monday.getDate() - dayOfWeek + 1 + (week_number - 1) * 7);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    // Delete existing schedules for the target departments, week, and year
    await Schedule.deleteMany({ 
      week_number, 
      year, 
      department_id: { $in: targetDepartments.map(d => d._id) } 
    });

    let usedGroq = false;
    // For each department, schedule only nurses assigned to that department
    for (const dept of targetDepartments) {
      const nursesInDept = await Nurse.find({ 
        is_active: true, 
        current_department_id: dept._id 
      }).lean();

      if (nursesInDept.length === 0) {
        insufficiencyDetails.push({
          department_id: dept._id,
          reason: "no_active_nurses",
          message: "No active nurses found for this department.",
        });
        continue;
      }

      const availableDivisionIds = new Set(
        nursesInDept
          .filter((n) => n.division_id)
          .map((n) => n.division_id.toString())
      );

      const missingDivisions = allDivisions
        .filter((d) => !availableDivisionIds.has(d._id.toString()))
        .map((d) => ({ id: d._id, name: d.name }));

      if (missingDivisions.length > 0) {
        insufficiencyDetails.push({
          department_id: dept._id,
          reason: "missing_division_coverage",
          message: "Not enough nurses to maintain equal division coverage for each duty.",
          missing_divisions: missingDivisions,
          available_nurses: nursesInDept.length,
        });

        if (!force_assign_remaining) {
          continue;
        }
      }

      // Fetch previous schedule for context
      const prevWeek = week_number === 1 ? 52 : week_number - 1;
      const prevYear = week_number === 1 ? year - 1 : year;
      const prevSchedule = await Schedule.find({
        department_id: dept._id,
        week_number: prevWeek,
        year: prevYear
      }).lean();

      let deptScheduleEntries = [];
      try {
        deptScheduleEntries = await generateScheduleWithGroq(
          nursesInDept,
          dept._id,
          days,
          shift_pattern,
          max_shifts_per_week,
          week_number,
          year,
          req.authUser.id,
          prevSchedule
        );
        usedGroq = true;
        console.log(`[GenerateSchedule] Successfully generated schedule via Groq for dept ${dept._id}`);
      } catch (err) {
        console.log(`[GenerateSchedule] Falling back to algorithmic scheduler: ${err.message}`);
        deptScheduleEntries = createBalancedScheduleEntries(
          nursesInDept,
          dept._id,
          days,
          shift_pattern,
          max_shifts_per_week,
          week_number,
          year,
          req.authUser.id
        );
      }
      entries.push(...deptScheduleEntries);
    }

    if (entries.length === 0) {
      return res.status(400).json({
        code: "INSUFFICIENT_NURSES",
        error: "Notice: We found a few empty slots due to staff availability.",
        details: insufficiencyDetails,
        can_force_generate: true,
        prompt: "Would you like our AI to do its best and auto-assign the nurses you currently have available?",
      });
    }

    await Schedule.insertMany(entries);

    const assignedNurseIds = [...new Set(entries.map((e) => e.nurse_id.toString()))];
    const nurseUsers = await Nurse.find({ _id: { $in: assignedNurseIds }, user_id: { $ne: null } }).lean();

    if (nurseUsers.length > 0) {
      // Build a map: nurseId → their entries so each notification is personalised
      const nurseEntryMap = {};
      for (const entry of entries) {
        const nid = entry.nurse_id.toString();
        if (!nurseEntryMap[nid]) nurseEntryMap[nid] = [];
        nurseEntryMap[nid].push(entry);
      }

      const shiftLabel = (t) => (t === "day" ? "Day (6AM-6PM)" : "Night (6PM-6AM)");

      await Notification.insertMany(
        nurseUsers.map((n) => {
          const myEntries = nurseEntryMap[n._id.toString()] || [];
          const shiftLines = myEntries
            .sort((a, b) => a.duty_date.localeCompare(b.duty_date))
            .map((e) => `• ${e.duty_date}  ${shiftLabel(e.shift_type)}`)
            .join("\n");
          return {
            user_id: n.user_id,
            title: "📅 Your Schedule for Week " + week_number,
            message:
              `Your schedule for week ${week_number} of ${year} has been published:\n\n` +
              shiftLines +
              "\n\nYou will also receive a reminder the evening before each shift and 30 minutes before it begins.",
            notification_type: "schedule_published",
            is_read: false,
          };
        })
      );
    }

    await ActivityLog.create({
      user_id: req.authUser.id,
      action: "schedule_generated",
      entity_type: "schedule",
      description: `Generated schedule for week ${week_number} of ${year}`,
    });

    return res.json({
      success: true,
      stats: { total_entries: entries.length, nurses_scheduled: assignedNurseIds.length },
      fallback_used: Boolean(force_assign_remaining),
      ai_used: usedGroq,
      warnings: insufficiencyDetails,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to generate schedule" });
  }
});

async function performScheduleSwap(swapId, performerId) {
  const swap = await ShiftSwapRequest.findById(swapId);
  if (!swap) throw new Error("Swap request not found");

  const requesterSchedule = await Schedule.findById(swap.requester_schedule_id);
  const targetSchedule = await Schedule.findById(swap.target_schedule_id);
  
  if (requesterSchedule && targetSchedule) {
    const reqNurseId = requesterSchedule.nurse_id;
    const targetNurseId = targetSchedule.nurse_id;
    
    // Use a dummy ID temporarily to avoid the unique compound index violation
    const dummyId = new mongoose.Types.ObjectId();
    await Schedule.findByIdAndUpdate(requesterSchedule._id, { nurse_id: dummyId });
    await Schedule.findByIdAndUpdate(targetSchedule._id, { nurse_id: reqNurseId });
    await Schedule.findByIdAndUpdate(requesterSchedule._id, { nurse_id: targetNurseId });
  }

  swap.status = "approved";
  swap.reviewed_by = performerId;
  await swap.save();

  await ActivityLog.create({
    user_id: performerId,
    action: "swap_approved",
    entity_type: "shift_swap_request",
    entity_id: swapId,
    description: "Shift swap auto-approved after mutual agreement",
  });
}

router.post("/handle-swap", requireAuth, requireRole("admin", "head_nurse"), async (req, res) => {
  try {
    const { swap_id, action } = req.body;
    if (action === "approved") {
      await performScheduleSwap(swap_id, req.authUser.id);
    } else {
      await ShiftSwapRequest.findByIdAndUpdate(swap_id, { status: "rejected", reviewed_by: req.authUser.id });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to handle swap" });
  }
});

router.post("/swaps/initiate", requireAuth, requireRole("head_nurse"), async (req, res) => {
  try {
    const { requester_schedule_id, target_schedule_id, reason } = req.body;
    const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
    if (!headNurse) return res.status(403).json({ error: "Unauthorized" });

    const requesterSchedule = await Schedule.findById(requester_schedule_id).lean();
    const targetSchedule = await Schedule.findById(target_schedule_id).lean();

    const swapRequest = await ShiftSwapRequest.create({
      requester_nurse_id: requesterSchedule.nurse_id,
      target_nurse_id: targetSchedule.nurse_id,
      requester_schedule_id,
      target_schedule_id,
      reason: reason || "Initiated by Head Nurse",
      status: "pending_target",
      requested_at: new Date(),
    });

    const targetNurse = await Nurse.findById(targetSchedule.nurse_id).lean();
    if (targetNurse?.user_id) {
      await Notification.create({
        user_id: targetNurse.user_id,
        title: "Shift Swap Request",
        message: `Your head nurse has requested a shift swap for ${targetSchedule.duty_date}.`,
        notification_type: "swap_request",
        is_read: false,
        related_entity_id: swapRequest._id,
      });
    }

    return res.json({ success: true, swap_id: swapRequest._id.toString() });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to initiate swap" });
  }
});

router.post("/swaps/nurse-request", requireAuth, requireRole("nurse"), async (req, res) => {
  try {
    const { requester_schedule_id, target_schedule_id, target_nurse_id } = req.body;
    const requesterNurse = await Nurse.findOne({ user_id: req.authUser.id }).lean();
    const targetNurse = await Nurse.findById(target_nurse_id).lean();

    const swapRequest = await ShiftSwapRequest.create({
      requester_nurse_id: requesterNurse._id,
      target_nurse_id: target_nurse_id,
      requester_schedule_id,
      target_schedule_id,
      status: "pending_target",
    });

    if (targetNurse?.user_id) {
      const targetSchedule = await Schedule.findById(target_schedule_id).lean();
      await Notification.create({
        user_id: targetNurse.user_id,
        title: "Shift Swap Request",
        message: `${requesterNurse.name} has requested to swap shifts with you on ${targetSchedule?.duty_date}.`,
        notification_type: "swap_request",
        is_read: false,
        related_entity_id: swapRequest._id,
      });
    }

    return res.json({ success: true, swap_id: swapRequest._id.toString() });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to create swap request" });
  }
});

router.post("/swaps/nurse-respond", requireAuth, requireRole("nurse"), async (req, res) => {
  try {
    const { swap_id, action } = req.body;
    const nurse = await Nurse.findOne({ user_id: req.authUser.id }).lean();
    const swap = await ShiftSwapRequest.findById(swap_id);
    
    if (!swap || swap.target_nurse_id.toString() !== nurse._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (action === "rejected") {
      swap.status = "rejected";
      await swap.save();
    } else if (action === "accepted") {
      await performScheduleSwap(swap_id, req.authUser.id);
      
      const requester = await Nurse.findById(swap.requester_nurse_id).lean();
      if (requester?.user_id) {
        await Notification.create({
          user_id: requester.user_id,
          title: "Swap Request Finalized",
          message: `${nurse.name} accepted your swap request. Your schedule has been updated.`,
          notification_type: "swap_accepted",
          is_read: false,
          related_entity_id: swap._id,
        });
      }
    }

    return res.json({ success: true, status: "approved" });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to process response" });
  }
});

router.post("/generate-vapid-keys", requireAuth, async (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "BMM-E7_W6U_v6O8S1uY-O7rR_W7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P7-k7Y-P"; 
  return res.json({ publicKey });
});

router.post("/duty-reminders", requireAuth, requireRole("admin", "head_nurse"), async (_req, res) => {
  return res.json({ success: true, reminders_sent: 0 });
});

// ── Assign / clear acuity for a nurse ────────────────────────────────────────
// PATCH /functions/nurses/:id/acuity
// Body: { division_id: "<objectId>" | null }
router.patch("/nurses/:id/acuity", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { division_id } = req.body;

    // Validate the division exists when provided
    if (division_id) {
      const div = await Division.findById(division_id).lean();
      if (!div) return res.status(404).json({ error: "Acuity level not found" });
    }

    const nurse = await Nurse.findByIdAndUpdate(
      id,
      { $set: { division_id: division_id || null } },
      { new: true }
    )
      .populate({ path: "division_id", select: "name acuity_level" })
      .populate({ path: "current_department_id", select: "name" })
      .lean();

    if (!nurse) return res.status(404).json({ error: "Nurse not found" });

    return res.json({
      id:         nurse._id.toString(),
      name:       nurse.name,
      division_id: nurse.division_id?._id?.toString() ?? null,
      divisions:  nurse.division_id
        ? { id: nurse.division_id._id.toString(), name: nurse.division_id.name, acuity_level: nurse.division_id.acuity_level }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update acuity" });
  }
});

// ── Deactivate a nurse ────────────────────────────────────────────────────────
// PATCH /functions/nurses/:id/deactivate
router.patch("/nurses/:id/deactivate", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nurse = await Nurse.findById(id);
    if (!nurse) return res.status(404).json({ error: "Nurse not found" });

    // If there's a linked user, delete them too
    if (nurse.user_id) {
      await User.findByIdAndDelete(nurse.user_id);
      await UserRole.deleteMany({ user_id: nurse.user_id });
    }

    // Delete the nurse
    const nurseName = nurse.name;
    await Nurse.findByIdAndDelete(id);

    // Log the activity in central logs
    await ActivityLog.create({
      action: "NURSE_REMOVED",
      description: `Nurse ${nurseName} was completely removed from the database by ${req.authUser.name}`,
      user_id: req.authUser.id,
      entity_type: "nurse",
      entity_id: id
    });

    // Also record in specialized nurse_removals collection
    await NurseRemoval.create({
      nurse_id: new mongoose.Types.ObjectId(), // Use new ID since old one is deleted
      nurse_name: nurseName,
      removed_by: req.authUser.id,
      reason: `Permanently removed by ${req.authUser.role}`
    });

    return res.json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to remove nurse" });
  }
});

export default router;

