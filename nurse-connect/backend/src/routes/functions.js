import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  ActivityLog,
  Admin,
  Department,
  Division,
  Ward,
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
    const { email, password, confirmPassword, role, name, username, department_id, division_id, ward_id } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const normalizedUsername = String(username || "").trim();
    const allowedRoles = new Set(["head_nurse", "admin"]);

    if (!normalizedEmail || !password || !confirmPassword || !normalizedName || !normalizedUsername || !allowedRoles.has(role)) {
      return res.status(400).json({ error: "Invalid create-user payload" });
    }

    if (role === "head_nurse" && !ward_id) {
      return res.status(400).json({ error: "Ward ID is required for head nurse creation" });
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

    // For head_nurse role, ensure only one head nurse per ward (if ward provided)
    if (role === "head_nurse" && ward_id) {
      const existingHeadNurse = await HeadNurse.findOne({ ward_id }).lean();
      if (existingHeadNurse) {
        return res.status(400).json({ error: "A head nurse already exists for this ward" });
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
      await HeadNurse.create({ 
        user_id: user._id, 
        name: normalizedName, 
        username: normalizedUsername, 
        department_id: department_id || null, 
        division_id: division_id || null, 
        ward_id: ward_id || null 
      });
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
    const { 
      week_number, year, department_id, ward_id,
      force_assign_remaining = false, 
      shift_pattern = "12_hours", 
      max_shifts_per_week = 3,
      confirm_overwrite = false,
      acuity_requirements = {}
    } = req.body;
    
    // Validate year - only allow current year and next year for head nurses
    const currentYear = new Date().getFullYear();
    if (req.authUser.role === "head_nurse" && (year < currentYear || year > currentYear + 1)) {
      return res.status(400).json({
        error: `Cannot generate schedule for year ${year}. Head nurses can only generate schedules for ${currentYear} or ${currentYear + 1}.`
      });
    }
    
    // Validate year for admins - only allow 2 years back to 2 years forward
    if (req.authUser.role === "admin" && (year < currentYear - 2 || year > currentYear + 2)) {
      return res.status(400).json({
        error: `Cannot generate schedule for year ${year}. Schedules can only be generated for years between ${currentYear - 2} and ${currentYear + 2}.`
      });
    }

    // Date constraints for head nurse: only current week and next 3 weeks
    if (req.authUser.role === "head_nurse") {
      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = now.getFullYear();

      // Simple week distance calculation
      const weekDiff = (year - currentYear) * 52 + (week_number - currentWeek);

      if (weekDiff < 0) {
        return res.status(400).json({ error: "Cannot generate schedules for past weeks." });
      }

      if (weekDiff > 3) {
        return res.status(400).json({ error: "You can only generate schedules up to 4 weeks in advance (current week + 3 future weeks)." });
      }
    }
    
    // Determine which wards to schedule for (scheduling is ward-specific)
    let targetWards;

    if (req.authUser.role === "head_nurse") {
      // Head nurse can only generate schedules for their own ward.
      const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
      if (!headNurse || !headNurse.ward_id) {
        return res.status(400).json({
          code: "HEAD_NURSE_WARD_MISSING",
          error: "Your head nurse account is not linked to a ward. Please contact admin.",
        });
      }

      const requestedWardId = ward_id || headNurse.ward_id;
      if (String(headNurse.ward_id) !== String(requestedWardId)) {
        return res.status(403).json({ error: "You can only generate schedules for your own ward" });
      }
      targetWards = [{ _id: requestedWardId }];
    } else if (req.authUser.role === "admin") {
      // Admin can generate for specific ward, specific department (all wards in it), or all wards
      if (ward_id) {
        targetWards = [{ _id: ward_id }];
      } else if (department_id) {
        targetWards = await Ward.find({ department_id }).lean();
      } else {
        targetWards = await Ward.find({}).lean();
      }
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!targetWards || targetWards.length === 0) {
      return res.status(400).json({ error: "No wards found to generate schedules for" });
    }

    // Check if schedule already exists and handle confirmation (ward-level)
    if (!confirm_overwrite) {
      const existing = await Schedule.findOne({
        week_number,
        year,
        ward_id: { $in: targetWards.map(w => w._id) }
      }).lean();

      if (existing) {
        return res.status(409).json({
          code: "SCHEDULE_ALREADY_EXISTS",
          error: `A schedule already exists for Week ${week_number}, ${year}.`,
          prompt: "Regenerating will overwrite the existing roster. Do you want to proceed?"
        });
      }
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

    let usedGroq = false;
    
    // VALIDATION PHASE: Check if requested acuity targets are feasible for all target wards
    for (const ward of targetWards) {
      const nursesInWard = await Nurse.find({ 
        is_active: true, 
        current_ward_id: ward._id 
      }).populate("division_id").lean();

      if (nursesInWard.length === 0) continue;

      const nursesByDiv = {};
      nursesInWard.forEach(n => {
        const divId = n.division_id?._id?.toString() || "no_division";
        nursesByDiv[divId] = (nursesByDiv[divId] || 0) + 1;
      });

      const SHIFTS_PER_WEEK = 7 * (shift_pattern === "8_hours" ? 3 : 2);
      const infeasibleDivisions = [];
      
      for (const [divId, countPerShift] of Object.entries(acuity_requirements)) {
        if (countPerShift <= 0) continue;
        
        const totalSlotsNeeded = countPerShift * SHIFTS_PER_WEEK;
        const availableNursesCount = nursesByDiv[divId] || 0;
        const maxCapacity = availableNursesCount * max_shifts_per_week;
        
        if (totalSlotsNeeded > maxCapacity) {
          const div = allDivisions.find(d => d._id.toString() === divId);
          infeasibleDivisions.push({
            name: div?.name || "Unknown",
            requested: countPerShift,
            available_nurses: availableNursesCount,
            max_capacity_shifts: maxCapacity,
            needed_shifts: totalSlotsNeeded
          });
        }
      }

      if (infeasibleDivisions.length > 0 && !force_assign_remaining) {
         return res.status(400).json({
            code: "INSUFFICIENT_ACUITY_RESOURCES",
            error: "Not enough nurses to meet your acuity staffing targets.",
            details: infeasibleDivisions,
            can_force_generate: true,
            prompt: "Would you like to generate the schedule anyway? The system will prioritize the closest available acuity levels to ensure the ward remains staffed."
         });
      }
    }

    // DELETION PHASE: Only delete once we've passed validation
    await Schedule.deleteMany({ 
      week_number, 
      year, 
      ward_id: { $in: targetWards.map(w => w._id) } 
    });
    // For each ward, schedule only nurses assigned to that ward
    for (const ward of targetWards) {
      const nursesInWard = await Nurse.find({ 
        is_active: true, 
        current_ward_id: ward._id 
      }).populate("division_id").lean();

      if (nursesInWard.length === 0) {
        insufficiencyDetails.push({
          ward_id: ward._id,
          department_id: ward.department_id || null,
          reason: "no_active_nurses",
          message: "No active nurses found for this ward.",
        });
        continue;
      }

      const availableDivisionIds = new Set(
        nursesInWard
          .filter((n) => n.division_id)
          .map((n) => n.division_id.toString())
      );

      const missingDivisions = allDivisions
        .filter((d) => !availableDivisionIds.has(d._id.toString()))
        .map((d) => ({ id: d._id, name: d.name }));

      if (missingDivisions.length > 0) {
        insufficiencyDetails.push({
          ward_id: ward._id,
          department_id: ward.department_id || null,
          reason: "missing_division_coverage",
          message: "Not enough nurses to maintain equal division coverage for each duty.",
          missing_divisions: missingDivisions,
          available_nurses: nursesInWard.length,
        });

        if (!force_assign_remaining) {
          continue;
        }
      }

      // Fetch previous schedule for context (ward-level)
      const prevWeek = week_number === 1 ? 52 : week_number - 1;
      const prevYear = week_number === 1 ? year - 1 : year;
      const prevSchedule = await Schedule.find({
        ward_id: ward._id,
        week_number: prevWeek,
        year: prevYear
      }).lean();

      let wardScheduleEntries = [];
      try {
        wardScheduleEntries = await generateScheduleWithGroq(
          nursesInWard,
          ward.department_id,
          ward._id,
          days,
          shift_pattern,
          max_shifts_per_week,
          week_number,
          year,
          req.authUser.id,
          prevSchedule,
          acuity_requirements
        );
        usedGroq = true;
        console.log(`[GenerateSchedule] Successfully generated schedule via Groq for ward ${ward._id}`);
      } catch (err) {
        console.log(`[GenerateSchedule] Falling back to algorithmic scheduler: ${err.message}`);
        wardScheduleEntries = createBalancedScheduleEntries(
          nursesInWard,
          ward.department_id,
          ward._id,
          days,
          shift_pattern,
          max_shifts_per_week,
          week_number,
          year,
          req.authUser.id,
          acuity_requirements
        );
      }

      // Ensure ward_id is included on every entry
      wardScheduleEntries = wardScheduleEntries.map((e) => ({ ...e, ward_id: ward._id }));
      entries.push(...wardScheduleEntries);
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

    // Notify target nurse
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

    // Notify head nurse(s) of the department
    const requesterSchedule = await Schedule.findById(requester_schedule_id).lean();
    if (requesterSchedule?.ward_id || requesterSchedule?.department_id) {
      // Prefer notifying ward head nurses, fall back to department-level head nurses
      let headNurses = [];
      if (requesterSchedule?.ward_id) {
        headNurses = await HeadNurse.find({ ward_id: requesterSchedule.ward_id }).lean();
      }
      if (!headNurses || headNurses.length === 0) {
        headNurses = await HeadNurse.find({ department_id: requesterSchedule.department_id }).lean();
      }
      for (const hn of headNurses) {
        if (hn.user_id) {
          await Notification.create({
            user_id: hn.user_id,
            title: "Swap Request Pending Approval",
            message: `${requesterNurse.name} has requested a shift swap on ${requesterSchedule?.duty_date}. Please review and approve or reject.`,
            notification_type: "swap_request_admin",
            is_read: false,
            related_entity_id: swapRequest._id,
          });
        }
      }
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
      // Instead of auto-performing, move to pending_admin for Head Nurse approval
      swap.status = "pending_admin";
      await swap.save();
      
      const requester = await Nurse.findById(swap.requester_nurse_id).lean();
      if (requester?.user_id) {
        await Notification.create({
          user_id: requester.user_id,
          title: "Swap Request Accepted by Target",
          message: `${nurse.name} accepted your swap request. It is now waiting for Head Nurse approval.`,
          notification_type: "swap_accepted",
          is_read: false,
          related_entity_id: swap._id,
        });
      }

      // Notify head nurse(s) that both have agreed
      const requesterSchedule = await Schedule.findById(swap.requester_schedule_id).lean();
      if (requesterSchedule?.ward_id || requesterSchedule?.department_id) {
        let headNurses = [];
        if (requesterSchedule?.ward_id) {
          headNurses = await HeadNurse.find({ ward_id: requesterSchedule.ward_id }).lean();
        }
        if (!headNurses || headNurses.length === 0) {
          headNurses = await HeadNurse.find({ department_id: requesterSchedule.department_id }).lean();
        }
        for (const hn of headNurses) {
          if (hn.user_id) {
            await Notification.create({
              user_id: hn.user_id,
              title: "Swap Ready for Approval",
              message: `${requester?.name} and ${nurse.name} have both agreed to swap shifts on ${requesterSchedule.duty_date}. Please finalize the approval.`,
              notification_type: "swap_request_admin",
              is_read: false,
              related_entity_id: swap._id,
            });
          }
        }
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

// ── Toggle nurse active/inactive status ────────────────────────────────────────
// PATCH /functions/nurses/:id/toggle-status
router.patch("/nurses/:id/toggle-status", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const nurse = await Nurse.findById(id);
    if (!nurse) return res.status(404).json({ error: "Nurse not found" });

    const newStatus = !nurse.is_active;
    await Nurse.findByIdAndUpdate(id, { is_active: newStatus });

    // Log the activity
    await ActivityLog.create({
      action: newStatus ? "NURSE_ACTIVATED" : "NURSE_DEACTIVATED",
      description: `Nurse ${nurse.name} was ${newStatus ? "activated" : "deactivated"} by ${req.authUser.name}`,
      user_id: req.authUser.id,
      entity_type: "nurse",
      entity_id: id
    });

    return res.json({ success: true, id, is_active: newStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to toggle nurse status" });
  }
});

// ── Update schedule entries ────────────────────────────────────────────────────
// PATCH /functions/schedules/:id
router.patch("/schedules/:id", requireAuth, requireRole("admin", "head_nurse"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nurse_id, shift_type } = req.body;
    
    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });

    // Verify head nurse can only edit schedules for their own ward (fallback to department)
    if (req.authUser.role === "head_nurse") {
      const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
      if (!headNurse) return res.status(403).json({ error: "Unauthorized" });
      if (headNurse.ward_id) {
        if (!schedule.ward_id || String(schedule.ward_id) !== String(headNurse.ward_id)) {
          return res.status(403).json({ error: "You can only edit schedules for your own ward" });
        }
      } else {
        if (!schedule.department_id || String(schedule.department_id) !== String(headNurse.department_id)) {
          return res.status(403).json({ error: "You can only edit schedules for your own department" });
        }
      }
    }

    if (nurse_id) schedule.nurse_id = nurse_id;
    if (shift_type) schedule.shift_type = shift_type;
    
    await schedule.save();

    // Log the activity
    await ActivityLog.create({
      action: "SCHEDULE_UPDATED",
      description: `Schedule entry for ${new Date(schedule.duty_date).toLocaleDateString()} was updated by ${req.authUser.name}`,
      user_id: req.authUser.id,
      entity_type: "schedule",
      entity_id: id
    });

    return res.json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update schedule" });
  }
});

// ── Add nurse to schedule ──────────────────────────────────────────────────────
// POST /functions/schedules
router.post("/schedules", requireAuth, requireRole("admin", "head_nurse"), async (req, res) => {
  try {

    // allow overriding department_id/ward_id for admin, but for head_nurse derive them from their account
    let { nurse_id, department_id, ward_id, duty_date, shift_type, week_number, year } = req.body;

    // If head nurse, determine department_id and ward_id from their account to avoid client-side ID mismatches
    if (req.authUser.role === "head_nurse") {
      const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
      if (!headNurse) {
        return res.status(400).json({ error: "Your head nurse account is not linked to the right unit" });
      }
      if (!department_id && headNurse.department_id) department_id = headNurse.department_id;
      if (!ward_id && headNurse.ward_id) ward_id = headNurse.ward_id;
    }

    const missingFields = [];
    if (!nurse_id) missingFields.push("nurse_id");
    if (!department_id) missingFields.push("department_id");
    if (!duty_date) missingFields.push("duty_date");
    if (!shift_type) missingFields.push("shift_type");
    if (!week_number) missingFields.push("week_number");
    if (!year) missingFields.push("year");

    if (missingFields.length > 0) {
      console.log("[AddSchedule] Missing fields:", missingFields);
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(", ")}`,
        code: "MISSING_FIELDS",
        fields: missingFields
      });
    }

    // Check if nurse exists and is active
    const nurse = await Nurse.findById(nurse_id).lean();
    if (!nurse) return res.status(404).json({ error: "Nurse not found" });
    if (!nurse.is_active) return res.status(400).json({ error: "Cannot schedule an inactive nurse" });

    // Check for duplicate schedule (ward-level)
    const existing = await Schedule.findOne({
      nurse_id,
      duty_date,
      shift_type,
      department_id,
      ward_id
    }).lean();
    if (existing) return res.status(400).json({ error: "This nurse is already scheduled for this shift" });

    const schedule = await Schedule.create({
      nurse_id,
      department_id,
      ward_id,
      duty_date,
      shift_type,
      week_number,
      year
    });

    // Log the activity
    await ActivityLog.create({
      action: "SCHEDULE_ADDED",
      description: `${nurse.name} was added to schedule for ${new Date(duty_date).toLocaleDateString()} by ${req.authUser.name}`,
      user_id: req.authUser.id,
      entity_type: "schedule",
      entity_id: schedule._id
    });

    return res.status(201).json({ success: true, id: schedule._id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to add schedule" });
  }
});

// ── Remove nurse from schedule ─────────────────────────────────────────────────
// DELETE /functions/schedules/:id
router.delete("/schedules/:id", requireAuth, requireRole("admin", "head_nurse"), async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findById(id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });

    // Verify head nurse can only remove from their own ward (fallback to department)
    if (req.authUser.role === "head_nurse") {
      const headNurse = await HeadNurse.findOne({ user_id: req.authUser.id }).lean();
      if (!headNurse) return res.status(403).json({ error: "Unauthorized" });
      if (headNurse.ward_id) {
        if (!schedule.ward_id || String(schedule.ward_id) !== String(headNurse.ward_id)) {
          return res.status(403).json({ error: "You can only remove schedules from your own ward" });
        }
      } else {
        if (!schedule.department_id || String(schedule.department_id) !== String(headNurse.department_id)) {
          return res.status(403).json({ error: "You can only remove schedules from your own department" });
        }
      }
    }

    const nurse = await Nurse.findById(schedule.nurse_id).lean();
    await Schedule.findByIdAndDelete(id);

    // Log the activity
    await ActivityLog.create({
      action: "SCHEDULE_REMOVED",
      description: `${nurse?.name || "Nurse"} was removed from schedule for ${new Date(schedule.duty_date).toLocaleDateString()} by ${req.authUser.name}`,
      user_id: req.authUser.id,
      entity_type: "schedule",
      entity_id: id
    });

    return res.json({ success: true, id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to remove schedule" });
  }
});

export default router;

