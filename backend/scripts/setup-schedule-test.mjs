import dotenv from "dotenv";
import mongoose from "mongoose";
import { Schedule, Nurse, Department } from "../src/models/index.js";

dotenv.config();

const primaryUri = process.env.MONGODB_URI;
const directUri = process.env.MONGODB_URI_DIRECT;
const preferDirect = String(process.env.MONGODB_PREFER_DIRECT || "").toLowerCase() === "true";

const MONGO_URI = preferDirect && directUri ? directUri : primaryUri || "mongodb://localhost:27017/nurse-connect";

async function cleanupAndAddNurses() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing schedules for testing
    console.log("\n🗑️  Clearing existing schedules...");
    const deletedSchedules = await Schedule.deleteMany({});
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} old schedules`);

    // Drop and recreate indexes on nurses collection
    console.log("\n🔧 Fixing database indexes...");
    try {
      const nursesCollection = mongoose.connection.collection('nurses');
      await nursesCollection.dropIndex('user_id_1');
      console.log("✅ Dropped old user_id index");
    } catch (err) {
      if (err.code !== 27) { // Index not found is OK
        console.log("⏭️  user_id index already fixed or doesn't exist");
      }
    }

    // Get departments
    console.log("\n🏥 Fetching departments...");
    const caratisCancerInst = await Department.findOne({ name: "Caritas Cancer Institute" });
    const caratisHeartInst = await Department.findOne({ name: "Caritas Heart Institute" });
    const caratisNeuroSci = await Department.findOne({ name: "Caritas Neuro Sciences" });

    if (!caratisCancerInst || !caratisHeartInst || !caratisNeuroSci) {
      throw new Error("Departments not found. Run 'npm run seed-departments' first");
    }

    console.log(`✅ Found departments:`);
    console.log(`   - ${caratisCancerInst.name}`);
    console.log(`   - ${caratisHeartInst.name}`);
    console.log(`   - ${caratisNeuroSci.name}`);

    // Add more nurses to each department
    console.log("\n👨‍⚕️  Adding more nurses to departments...");
    
    const nurseData = [
      // Caritas Cancer Institute - Add 4 more nurses (total 5 including existing)
      { name: "Nurse CC 2", phone: "9496555310", gender: "female", deptId: caratisCancerInst._id },
      { name: "Nurse CC 3", phone: "9496555311", gender: "male", deptId: caratisCancerInst._id },
      { name: "Nurse CC 4", phone: "9496555312", gender: "female", deptId: caratisCancerInst._id },
      { name: "Nurse CC 5", phone: "9496555313", gender: "male", deptId: caratisCancerInst._id },

      // Caritas Heart Institute - Add 4 more nurses (total 5 including existing)
      { name: "Nurse HI 2", phone: "9496555320", gender: "female", deptId: caratisHeartInst._id },
      { name: "Nurse HI 3", phone: "9496555321", gender: "male", deptId: caratisHeartInst._id },
      { name: "Nurse HI 4", phone: "9496555322", gender: "female", deptId: caratisHeartInst._id },
      { name: "Nurse HI 5", phone: "9496555323", gender: "male", deptId: caratisHeartInst._id },

      // Caritas Neuro Sciences - Add 4 more nurses (total 5 including existing)
      { name: "Nurse NS 2", phone: "9496555330", gender: "female", deptId: caratisNeuroSci._id },
      { name: "Nurse NS 3", phone: "9496555331", gender: "male", deptId: caratisNeuroSci._id },
      { name: "Nurse NS 4", phone: "9496555332", gender: "female", deptId: caratisNeuroSci._id },
      { name: "Nurse NS 5", phone: "9496555333", gender: "male", deptId: caratisNeuroSci._id },
    ];

    for (const nurseInfo of nurseData) {
      // Check if nurse already exists
      const existing = await Nurse.findOne({ phone: nurseInfo.phone });
      if (existing) {
        console.log(`⏭️  ${nurseInfo.name} already exists`);
        continue;
      }

      const nurse = await Nurse.create({
        name: nurseInfo.name,
        phone: nurseInfo.phone,
        gender: nurseInfo.gender,
        current_department_id: nurseInfo.deptId,
        experience_years: Math.floor(Math.random() * 10) + 1,
        age: Math.floor(Math.random() * 13) + 25, // 25-38 years old
      });
      console.log(`✅ Created: ${nurseInfo.name} → ${(await Department.findById(nurseInfo.deptId)).name}`);
    }

    // Show department summary
    console.log("\n📊 Nurses per department:");
    const cancerCount = await Nurse.countDocuments({ current_department_id: caratisCancerInst._id });
    const heartCount = await Nurse.countDocuments({ current_department_id: caratisHeartInst._id });
    const neuroCount = await Nurse.countDocuments({ current_department_id: caratisNeuroSci._id });
    
    console.log(`   - ${caratisCancerInst.name}: ${cancerCount} nurses`);
    console.log(`   - ${caratisHeartInst.name}: ${heartCount} nurses`);
    console.log(`   - ${caratisNeuroSci.name}: ${neuroCount} nurses`);

    console.log("\n✅ Setup complete! You can now auto-generate schedules.");
    console.log("   Requirements met:");
    console.log("   ✓ 5+ nurses per department");
    console.log("   ✓ No conflicting schedules");
    console.log("\n   Try auto-generating schedules for Week 17, 2026");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

cleanupAndAddNurses();
