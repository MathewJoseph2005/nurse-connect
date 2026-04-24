import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const MONGO_URI = (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;

if (!MONGO_URI) throw new Error("No MongoDB URI in backend/.env");

const opts = { strict: false };
const Department = mongoose.model("Department", new mongoose.Schema({ name: String }, opts), "departments");
const HeadNurse = mongoose.model("HeadNurse", new mongoose.Schema({ 
  name: String, 
  user_id: mongoose.Schema.Types.ObjectId,
  department_id: mongoose.Schema.Types.ObjectId,
  username: String
}, opts), "head_nurses");
const User = mongoose.model("User", new mongoose.Schema({
  email: String,
  passwordHash: String,
  role: String,
  name: String,
  username: String
}, opts), "users");
const UserRole = mongoose.model("UserRole", new mongoose.Schema({ user_id: mongoose.Schema.Types.ObjectId, role: String }, opts), "user_roles");

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const depts = await Department.find();
  console.log(`Found ${depts.length} departments.`);

  const passwordHash = await bcrypt.hash("headnurse@123456", 10);
  let createdCount = 0;

  for (let i = 0; i < depts.length; i++) {
    const dept = depts[i];
    
    // Check if a head nurse exists for this department
    const existingHn = await HeadNurse.findOne({ department_id: dept._id });
    if (existingHn) {
      console.log(`   ⏭  Department ${dept.name} already has a Head Nurse (${existingHn.name}).`);
      continue;
    }

    const email = `hn_${dept.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@caritas.local`;
    const username = `hn_${dept.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const name = `Head Nurse - ${dept.name}`;

    const userDoc = await User.create({
      email,
      passwordHash,
      role: "head_nurse",
      name,
      username
    });

    await UserRole.create({
      user_id: userDoc._id,
      role: "head_nurse"
    });

    await HeadNurse.create({
      name,
      username,
      user_id: userDoc._id,
      department_id: dept._id,
    });

    console.log(`   ✅ Created ${name} for ${dept.name}`);
    createdCount++;
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ Done! Created: ${createdCount} Head Nurses.`);
  
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
