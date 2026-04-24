/**
 * seed-schedules.mjs
 * Creates 7 days of upcoming schedules for EVERY active nurse.
 *
 * Run:  node scripts/seed-schedules.mjs
 *
 * Rules:
 *  - Starts tomorrow so nurses see "upcoming" shifts in the SwapView
 *  - Each nurse gets one shift per day (unique index constraint)
 *  - Shifts rotate morning → evening → night across nurses so nurses on the
 *    same day have DIFFERENT shifts — making swap meaningful
 *  - Safe to re-run: skips existing (nurse_id + duty_date) pairs
 */
import "dotenv/config";
import mongoose from "mongoose";

const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const MONGO_URI =
  (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error("No MongoDB URI found in backend/.env");

// ── ISO Week helper ──────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ── Schemas ──────────────────────────────────────────────────────────────────
const nurseSchema = new mongoose.Schema({
  current_department_id: { type: mongoose.Schema.Types.ObjectId },
  is_active: Boolean,
  name: String,
});

const scheduleSchema = new mongoose.Schema({
  nurse_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  shift_type:    { type: String, enum: ["morning", "evening", "night"] },
  duty_date:     String,
  week_number:   Number,
  year:          Number,
  created_by:    { type: mongoose.Schema.Types.ObjectId, default: null },
});
scheduleSchema.index({ nurse_id: 1, duty_date: 1 }, { unique: true });

const Nurse    = mongoose.model("Nurse",    nurseSchema,    "nurses");
const Schedule = mongoose.model("Schedule", scheduleSchema, "schedules");

const SHIFTS = ["morning", "evening", "night"];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const nurses = await Nurse.find({ is_active: true }).lean();
  console.log(`Found ${nurses.length} active nurses\n`);

  // Build 7 days starting from tomorrow
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + 1 + i); // tomorrow + i
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  let created = 0, skipped = 0;

  // Group nurses by department so rotation stays within dept
  const byDept = new Map();
  for (const n of nurses) {
    const k = String(n.current_department_id);
    if (!byDept.has(k)) byDept.set(k, []);
    byDept.get(k).push(n);
  }

  for (const [deptIdStr, deptNurses] of byDept) {
    const deptId = new mongoose.Types.ObjectId(deptIdStr);

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const duty_date  = days[dayIdx];
      const dateObj    = new Date(duty_date + "T00:00:00Z");
      const week_number = getISOWeek(dateObj);
      const year       = dateObj.getUTCFullYear();

      for (let nIdx = 0; nIdx < deptNurses.length; nIdx++) {
        const nurse = deptNurses[nIdx];
        // Rotate shifts: nurse 0 → morning, nurse 1 → evening, nurse 2 → night, nurse 3 → morning…
        // Also stagger by day so the same nurse has different shifts on different days
        const shiftIdx = (nIdx + dayIdx) % 3;
        const shift_type = SHIFTS[shiftIdx];

        try {
          await Schedule.create({
            nurse_id:     nurse._id,
            department_id: deptId,
            shift_type,
            duty_date,
            week_number,
            year,
          });
          created++;
        } catch (err) {
          if (err.code === 11000) {
            skipped++; // duplicate, already exists
          } else {
            console.warn(`  ⚠ ${nurse.name} on ${duty_date}: ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`${"─".repeat(50)}`);
  console.log(`✅ Schedules seeded!`);
  console.log(`   Created : ${created}`);
  console.log(`   Skipped : ${skipped} (already existed)`);
  console.log(`\n📅 Date range: ${days[0]} → ${days[days.length - 1]}`);
  console.log(`   (7 days starting tomorrow — all nurses have upcoming shifts for swap testing)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
