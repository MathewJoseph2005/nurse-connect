import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin, HeadNurse, Nurse, User, UserRole, Department } from "../src/models/index.js";

dotenv.config();

const primaryUri = process.env.MONGODB_URI;
const directUri = process.env.MONGODB_URI_DIRECT;
const preferDirect = String(process.env.MONGODB_PREFER_DIRECT || "").toLowerCase() === "true";

const MONGO_URI = preferDirect && directUri ? directUri : primaryUri || "mongodb://localhost:27017/nurse-connect";

async function createTestUsers() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing test users
    console.log("\n🗑️  Clearing existing test users...");
    // Delete user records from Users collection only
    await User.deleteMany({ email: { $regex: "@caritas.local$" } });
    console.log("✅ Test users cleared");

    // Test Admin User
    console.log("\n👤 Creating admin user...");
    const adminPasswordHash = await bcrypt.hash("admin@123456", 10);
    const adminUser = await User.create({
      email: "admin@caritas.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      name: "Admin Demo",
      username: "admin",
    });
    await UserRole.create({ user_id: adminUser._id, role: "admin" });
    await Admin.create({
      user_id: adminUser._id,
      name: "Admin Demo",
      username: "admin",
      email: "admin@caritas.local",
    });
    console.log("✅ Admin user created");
    console.log("   📧 Email: admin@caritas.local");
    console.log("   👤 Username: admin");
    console.log("   🔑 Password: admin@123456");

    // Test Head Nurse Users (2 of them)
    console.log("\n👤 Creating head nurse users...");
    const headNurseIds = [];
    for (let i = 1; i <= 2; i++) {
      const headNursePasswordHash = await bcrypt.hash("headnurse@123456", 10);
      const headNurseUser = await User.create({
        email: `headnurse${i}@caritas.local`,
        passwordHash: headNursePasswordHash,
        role: "head_nurse",
        name: `Head Nurse ${i}`,
        username: `headnurse${i}`,
      });
      await UserRole.create({ user_id: headNurseUser._id, role: "head_nurse" });
      const headNurseRecord = await HeadNurse.create({
        user_id: headNurseUser._id,
        name: `Head Nurse ${i}`,
        username: `headnurse${i}`,
        phone: `9496555${200 + i}`,
        gender: i % 2 === 0 ? "female" : "male",
      });
      headNurseIds.push(headNurseRecord._id);
      console.log(`✅ Head Nurse ${i} created`);
      console.log(`   📧 Email: headnurse${i}@caritas.local`);
      console.log(`   👤 Username: headnurse${i}`);
      console.log(`   🔑 Password: headnurse@123456`);
      console.log(`   📱 Phone: 9496555${200 + i}`);
    }

    // Test Nurse Users (3 of them)
    console.log("\n👤 Creating nurse users...");
    // First, create nurses without users (as they would be pre-registered by head nurse)
    const nursePhonesForPreReg = [
      { phone: "9496555300", name: "Nurse Test 1" },
      { phone: "9496555301", name: "Nurse Test 2" },
      { phone: "9496555302", name: "Nurse Test 3" },
    ];

    for (let idx = 0; idx < nursePhonesForPreReg.length; idx++) {
      const { phone, name } = nursePhonesForPreReg[idx];
      // Check if nurse already exists
      const existing = await Nurse.findOne({ phone });
      if (!existing) {
        await Nurse.create({
          name,
          phone,
          gender: Math.random() > 0.5 ? "female" : "male",
          experience_years: Math.floor(Math.random() * 10) + 1,
        });
      }
      
      // Find and update the nurse with user
      const nurseRecord = await Nurse.findOne({ phone });
      
      if (!nurseRecord.user_id) {
        const nursePasswordHash = await bcrypt.hash("nurse@123456", 10);
        const nurseUser = await User.create({
          email: `nurse${idx + 1}@caritas.local`,
          passwordHash: nursePasswordHash,
          role: "nurse",
          name,
          phone,
        });
        await UserRole.create({ user_id: nurseUser._id, role: "nurse" });
        await Nurse.updateOne({ phone }, { $set: { user_id: nurseUser._id } });
      }
      
      console.log(`✅ ${name} created`);
      console.log(`   📧 Email: nurse${idx + 1}@caritas.local`);
      console.log(`   📱 Phone: ${phone}`);
      console.log(`   🔑 Password: nurse@123456`);
    }

    console.log("\n✅ All test users created successfully!");

    // Assign departments to test users
    console.log("\n🏥 Assigning departments to test users...");
    const allDepartments = await Department.find();
    
    if (allDepartments.length > 0) {
      // Assign first department to head nurse 1
      if (headNurseIds.length > 0) {
        await HeadNurse.updateOne(
          { _id: headNurseIds[0] },
          { $set: { department_id: allDepartments[0]._id } }
        );
        console.log(`✅ Head Nurse 1 assigned to: ${allDepartments[0].name}`);
      }
      
      // Assign second department to head nurse 2
      if (headNurseIds.length > 1 && allDepartments.length > 1) {
        await HeadNurse.updateOne(
          { _id: headNurseIds[1] },
          { $set: { department_id: allDepartments[1]._id } }
        );
        console.log(`✅ Head Nurse 2 assigned to: ${allDepartments[1].name}`);
      }
      
      // Assign departments to nurses (cycle through departments)
      const allNurses = await Nurse.find({});
      for (let i = 0; i < allNurses.length; i++) {
        const deptIndex = i % allDepartments.length;
        await Nurse.updateOne(
          { _id: allNurses[i]._id },
          { $set: { current_department_id: allDepartments[deptIndex]._id } }
        );
        console.log(`✅ ${allNurses[i].name} assigned to: ${allDepartments[deptIndex].name}`);
      }
    } else {
      console.log("⚠️  No departments found. Run 'npm run seed-departments' first.");
    }

    console.log("\n✅ Department assignments complete!");
    console.log("\n📋 Test Credentials Summary:\n");
    console.log("ADMIN:");
    console.log("  Email: admin@caritas.local");
    console.log("  Password: admin@123456\n");
    console.log("HEAD NURSE 1:");
    console.log("  Email: headnurse1@caritas.local");
    console.log("  Password: headnurse@123456\n");
    console.log("HEAD NURSE 2:");
    console.log("  Email: headnurse2@caritas.local");
    console.log("  Password: headnurse@123456\n");
    console.log("NURSES:");
    console.log("  Email: nurse1@caritas.local | Password: nurse@123456");
    console.log("  Email: nurse2@caritas.local | Password: nurse@123456");
    console.log("  Email: nurse3@caritas.local | Password: nurse@123456");

  } catch (error) {
    console.error("❌ Error creating test users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

createTestUsers();
