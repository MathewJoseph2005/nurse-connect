import "dotenv/config";
import mongoose from "mongoose";

const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const uri = (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({ email: String, role: String, name: String }, { strict: false });
const hnSchema   = new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, name: String, department_id: mongoose.Schema.Types.ObjectId }, { strict: false });
const nurseSchema = new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, name: String, current_department_id: mongoose.Schema.Types.ObjectId, is_active: Boolean }, { strict: false });
const deptSchema = new mongoose.Schema({ name: String }, { strict: false });

const User      = mongoose.model("User",      userSchema,  "users");
const HeadNurse = mongoose.model("HeadNurse", hnSchema,    "head_nurses");
const Nurse     = mongoose.model("Nurse",     nurseSchema, "nurses");
const Dept      = mongoose.model("Dept",      deptSchema,  "departments");

async function main() {
  await mongoose.connect(uri);
  const depts   = await Dept.find().lean();
  const deptMap = Object.fromEntries(depts.map(d => [String(d._id), d.name]));
  const users   = await User.find().lean();
  const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

  // HEAD NURSES
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║              HEAD NURSE CREDENTIALS                   ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  const hns = await HeadNurse.find().lean();
  for (const hn of hns) {
    const u    = userMap[String(hn.user_id)];
    const dept = deptMap[String(hn.department_id)] || "Unassigned";
    console.log(`\n  Name      : ${hn.name}`);
    console.log(`  Email     : ${u?.email}`);
    console.log(`  Password  : headnurse@123456`);
    console.log(`  Department: ${dept}`);
  }

  // NURSES per department
  console.log("\n\n╔════════════════════════════════════════════════════════╗");
  console.log("║                 NURSE CREDENTIALS                     ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("  (all passwords: nurse@123456)\n");

  const nurses = await Nurse.find({ is_active: true }).lean();
  const byDept = {};
  for (const n of nurses) {
    const dk = deptMap[String(n.current_department_id)] || "Unassigned";
    if (!byDept[dk]) byDept[dk] = [];
    byDept[dk].push(n);
  }

  for (const [dept, ns] of Object.entries(byDept)) {
    console.log(`\n  📋 ${dept}`);
    for (const n of ns) {
      const u = n.user_id ? userMap[String(n.user_id)] : null;
      const email = u?.email || "(no login)";
      console.log(`     ${n.name.padEnd(25)} ${email}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
