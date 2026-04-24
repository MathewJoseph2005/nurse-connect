/**
 * seed-test-nurses.mjs
 * Creates 4 nurses per department so auto-generate & swap features can be tested.
 *
 * Run with:  node scripts/seed-test-nurses.mjs
 *
 * Each nurse gets:
 *  - A User account  (email: nurse_<dept_code><n>@caritas.local / password: nurse@123456)
 *  - An Acuity level (cycles Acuity 1→4)
 *  - A realistic exam score that matches the acuity
 *  - department assignment
 *
 * Safe to re-run — skips nurses whose phone already exists.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Connection ─────────────────────────────────────────────────────────────
const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const MONGO_URI =
  (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error("No MongoDB URI in backend/.env");

// ── Inline schemas (mirrors src/models/) ───────────────────────────────────
const userSchema = new mongoose.Schema(
  { email: String, passwordHash: String, role: String, name: String, username: String, phone: String },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
const userRoleSchema = new mongoose.Schema(
  { user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, role: String },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);
const nurseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, unique: true, sparse: true },
    name: String, age: Number, phone: { type: String, unique: true },
    gender: String,
    division_id: { type: mongoose.Schema.Types.ObjectId, ref: "Division", default: null },
    current_department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    exam_score_percentage: Number, experience_years: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
const deptSchema = new mongoose.Schema({ name: String });
const divSchema  = new mongoose.Schema({ name: String, acuity_level: Number });

const User       = mongoose.model("User",       userSchema,     "users");
const UserRole   = mongoose.model("UserRole",   userRoleSchema, "user_roles");
const Nurse      = mongoose.model("Nurse",      nurseSchema,    "nurses");
const Department = mongoose.model("Department", deptSchema,     "departments");
const Division   = mongoose.model("Division",   divSchema,      "divisions");

// ── Acuity score ranges ────────────────────────────────────────────────────
// Acuity 1 → 0–19, Acuity 2 → 20–34, Acuity 3 → 35–60, Acuity 4 → 60+
const ACUITY_SCORES = [10, 27, 48, 75]; // representative scores per acuity 1-4
const GENDERS = ["female", "male", "female", "male"];

// ── Nurse name banks ────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Aisha", "Meera", "Priya", "Reka", "Divya", "Sneha", "Nisha", "Lakshmi",
  "Anu", "Bindu", "Celine", "Devi", "Fathima", "Geetha", "Hema", "Indira",
  "Jyothi", "Kavya", "Latha", "Maya",
];
const LAST_NAMES = [
  "Thomas", "Nair", "Raj", "Kumar", "Pillai", "Menon", "Varghese", "George",
  "Joseph", "Mathew", "Abraham", "Philip", "John", "Paul", "Simon",
];

function pickName(deptIdx, nurseIdx) {
  const fi = (deptIdx * 4 + nurseIdx) % FIRST_NAMES.length;
  const li = (deptIdx * 3 + nurseIdx * 7 + 2) % LAST_NAMES.length;
  return `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
}

// phone: 9496 + 566000 + sequential
function makePhone(seq) {
  return `9496${String(566000 + seq).padStart(6, "0")}`;
}

// dept abbreviation for email
function deptCode(deptName) {
  return deptName
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toLowerCase())
    .join("")
    .slice(0, 4);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const departments = await Department.find().sort({ name: 1 });
  const divisions   = await Division.find().sort({ acuity_level: 1 });

  if (departments.length === 0) {
    console.error("❌ No departments found. Run: npm run seed-departments");
    process.exit(1);
  }
  if (divisions.length === 0) {
    console.error("❌ No acuity levels found. Run: npm run seed-acuity");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("nurse@123456", 10);
  let seq = 0;
  let created = 0, skipped = 0;

  for (let di = 0; di < departments.length; di++) {
    const dept = departments[di];
    const code = deptCode(dept.name);
    console.log(`\n🏥 ${dept.name}`);

    for (let ni = 0; ni < 4; ni++) {
      seq++;
      const phone = makePhone(seq);
      const acuityIdx = ni % divisions.length; // cycles 0,1,2,3
      const division  = divisions[acuityIdx];
      const name      = pickName(di, ni);
      const email     = `nurse_${code}${ni + 1}@caritas.local`;
      const examScore = ACUITY_SCORES[acuityIdx];
      const expYears  = 1 + ((di + ni * 3) % 10);
      const gender    = GENDERS[ni];
      const age       = 24 + ((di + ni * 2) % 15);

      // Skip if phone already taken
      const exists = await Nurse.findOne({ phone });
      if (exists) {
        console.log(`   ⏭  Skipped (phone exists): ${name} — ${phone}`);
        skipped++;
        continue;
      }

      // Create User account
      let userDoc = await User.findOne({ email });
      if (!userDoc) {
        userDoc = await User.create({
          email,
          passwordHash,
          role: "nurse",
          name,
          phone,
        });
        await UserRole.create({ user_id: userDoc._id, role: "nurse" });
      }

      // Create Nurse record
      await Nurse.create({
        user_id: userDoc._id,
        name,
        age,
        phone,
        gender,
        division_id: division._id,
        current_department_id: dept._id,
        exam_score_percentage: examScore,
        experience_years: expYears,
        is_active: true,
      });

      console.log(`   ✅ ${name} | ${division.name} | score ${examScore} | ${email}`);
      created++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Done!  Created: ${created}  Skipped: ${skipped}`);
  console.log(`\n🔑 All nurse passwords: nurse@123456`);
  console.log(`   Email pattern: nurse_<deptcode><1-4>@caritas.local`);
  console.log(`   Example: nurse_cc1@caritas.local (Caritas Cancer Institute, Nurse 1)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
