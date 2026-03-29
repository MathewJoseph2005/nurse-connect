import express from "express";
import {
  ActivityLog,
  Admin,
  Department,
  Division,
  HeadNurse,
  Nurse,
  NurseLeave,
  NurseRemoval,
  Notification,
  PerformanceEvaluation,
  PushSubscription,
  Schedule,
  ShiftSwapRequest,
  UserRole,
} from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const modelMap = {
  user_roles: UserRole,
  divisions: Division,
  departments: Department,
  nurses: Nurse,
  head_nurses: HeadNurse,
  admins: Admin,
  schedules: Schedule,
  shift_swap_requests: ShiftSwapRequest,
  notifications: Notification,
  performance_evaluations: PerformanceEvaluation,
  nurse_removals: NurseRemoval,
  activity_logs: ActivityLog,
  nurse_leaves: NurseLeave,
  push_subscriptions: PushSubscription,
};

const populateMap = {
  nurses: [
    { path: "division_id", select: "name", model: "Division" },
    { path: "current_department_id", select: "name", model: "Department" },
  ],
  head_nurses: [{ path: "department_id", select: "name", model: "Department" }],
  schedules: [
    { path: "nurse_id", select: "name division_id", model: "Nurse" },
    { path: "department_id", select: "name", model: "Department" },
  ],
  shift_swap_requests: [
    { path: "requester_nurse_id", select: "name", model: "Nurse" },
    { path: "target_nurse_id", select: "name", model: "Nurse" },
    { path: "requester_schedule_id", select: "duty_date shift_type department_id", model: "Schedule", populate: { path: "department_id", select: "name", model: "Department" } },
    { path: "target_schedule_id", select: "duty_date shift_type department_id", model: "Schedule", populate: { path: "department_id", select: "name", model: "Department" } },
  ],
};

function castId(v) {
  if (typeof v !== "string") return v;
  return v;
}

function buildQuery(filters = []) {
  const query = {};
  for (const f of filters) {
    if (f.op === "eq") query[f.field] = castId(f.value);
    if (f.op === "neq") query[f.field] = { $ne: castId(f.value) };
    if (f.op === "gte") query[f.field] = { $gte: castId(f.value) };
    if (f.op === "in") query[f.field] = { $in: (f.value || []).map(castId) };
    if (f.op === "not" && f.operator === "is" && f.value === null) query[f.field] = { $ne: null };
  }
  return query;
}

function shapeRow(table, row) {
  const base = { ...row, id: row._id.toString() };
  delete base._id;
  delete base.__v;

  for (const key of Object.keys(base)) {
    if (key.endsWith("_id") && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      if (typeof base[key].toString === "function" && !base[key].name) {
        base[key] = base[key].toString();
      }
    }
  }

  if (table === "nurses") {
    base.divisions = row.division_id ? { name: row.division_id.name } : null;
    base.departments = row.current_department_id ? { name: row.current_department_id.name } : null;
  }
  if (table === "head_nurses") {
    base.departments = row.department_id ? { name: row.department_id.name } : null;
  }
  if (table === "schedules") {
    base.nurse = row.nurse_id
      ? {
          id: row.nurse_id._id?.toString?.() || row.nurse_id.id,
          name: row.nurse_id.name,
          division_id: row.nurse_id.division_id?.toString?.() || row.nurse_id.division_id || null,
        }
      : null;
    base.department = row.department_id ? { id: row.department_id._id?.toString?.() || row.department_id.id, name: row.department_id.name } : null;
  }
  if (table === "shift_swap_requests") {
    base.requester = row.requester_nurse_id ? { name: row.requester_nurse_id.name } : null;
    base.target = row.target_nurse_id ? { name: row.target_nurse_id.name } : null;
    base.requester_schedule = row.requester_schedule_id
      ? {
          duty_date: row.requester_schedule_id.duty_date,
          shift_type: row.requester_schedule_id.shift_type,
          department: row.requester_schedule_id.department_id ? { name: row.requester_schedule_id.department_id.name } : null,
        }
      : null;
    base.target_schedule = row.target_schedule_id
      ? {
          duty_date: row.target_schedule_id.duty_date,
          shift_type: row.target_schedule_id.shift_type,
          department: row.target_schedule_id.department_id ? { name: row.target_schedule_id.department_id.name } : null,
        }
      : null;
  }

  return base;
}

router.post("/query", requireAuth, async (req, res) => {
  try {
    const { table, action, filters, orders, limit, payload, options } = req.body;
    const Model = modelMap[table];
    if (!Model) return res.status(400).json({ error: `Unsupported table: ${table}` });

    const mongoQuery = buildQuery(filters);

    if (action === "select") {
      if (options?.head && options?.count === "exact") {
        const count = await Model.countDocuments(mongoQuery);
        return res.json({ data: [], count });
      }

      let q = Model.find(mongoQuery);
      if (populateMap[table]) {
        for (const p of populateMap[table]) q = q.populate(p);
      }
      for (const ord of orders || []) {
        q = q.sort({ [ord.field]: ord.ascending === false ? -1 : 1 });
      }
      if (limit) q = q.limit(limit);

      const docs = await q.lean();
      const shaped = docs.map((d) => shapeRow(table, d));
      if (options?.single || options?.maybeSingle) {
        return res.json({ data: shaped[0] || null, count: shaped.length });
      }
      return res.json({ data: shaped, count: shaped.length });
    }

    if (action === "insert") {
      const docs = Array.isArray(payload) ? payload : [payload];
      const created = await Model.insertMany(docs);
      return res.json({ data: created.map((d) => ({ ...d.toObject(), id: d._id.toString() })) });
    }

    if (action === "update") {
      await Model.updateMany(mongoQuery, { $set: payload });
      return res.json({ data: [] });
    }

    if (action === "delete") {
      await Model.deleteMany(mongoQuery);
      return res.json({ data: [] });
    }

    if (action === "upsert") {
      const docs = Array.isArray(payload) ? payload : [payload];
      for (const d of docs) {
        const filter = { user_id: d.user_id, endpoint: d.endpoint };
        await Model.updateOne(filter, { $set: d }, { upsert: true });
      }
      return res.json({ data: [] });
    }

    return res.status(400).json({ error: "Unsupported action" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "DB query failed" });
  }
});

router.post("/rpc/check_nurse_phone_exists", async (req, res) => {
  const { phone_number } = req.body;
  const nurse = await Nurse.findOne({ phone: phone_number, user_id: null }).lean();
  return res.json({ data: !!nurse });
});

router.post("/rpc/get_nurse_workload", requireAuth, async (req, res) => {
  const { nurse_uuid } = req.body;
  const today = new Date().toISOString().split("T")[0];
  const in7 = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const count = await Schedule.countDocuments({ nurse_id: nurse_uuid, duty_date: { $gte: today, $lt: in7 } });
  const level = count >= 5 ? "high" : count >= 3 ? "medium" : "low";
  return res.json({ data: level });
});

export default router;
