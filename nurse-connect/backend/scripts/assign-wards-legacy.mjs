import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MongoDB connection string not found in environment variables");
    }
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const Nurse = mongoose.model("Nurse", new mongoose.Schema({ 
  current_department_id: mongoose.Schema.Types.ObjectId,
  current_ward_id: mongoose.Schema.Types.ObjectId 
}), "nurses");

const HeadNurse = mongoose.model("HeadNurse", new mongoose.Schema({ 
  department_id: mongoose.Schema.Types.ObjectId,
  ward_id: mongoose.Schema.Types.ObjectId 
}), "head_nurses");

const Ward = mongoose.model("Ward", new mongoose.Schema({ 
  name: String, 
  department_id: mongoose.Schema.Types.ObjectId 
}), "wards");

const assignWardsToExisting = async () => {
  try {
    console.log("Fetching nurses...");
    const nurses = await Nurse.find({}).lean();
    console.log(`Found ${nurses.length} nurses.`);

    for (const nurse of nurses) {
      if (!nurse.current_department_id) continue;
      const firstWard = await Ward.findOne({ department_id: nurse.current_department_id }).lean();
      if (firstWard) {
        await Nurse.updateOne({ _id: nurse._id }, { $set: { current_ward_id: firstWard._id } });
        console.log(`  - Assigned ward ${firstWard.name} to nurse ${nurse._id}`);
      }
    }

    console.log("Fetching head nurses...");
    const headNurses = await HeadNurse.find({}).lean();
    console.log(`Found ${headNurses.length} head nurses.`);

    for (const hn of headNurses) {
      if (!hn.department_id) continue;
      const firstWard = await Ward.findOne({ department_id: hn.department_id }).lean();
      if (firstWard) {
        await HeadNurse.updateOne({ _id: hn._id }, { $set: { ward_id: firstWard._id } });
        console.log(`  - Assigned ward ${firstWard.name} to head nurse ${hn._id}`);
      }
    }

  } catch (error) {
    console.error("✗ Error assigning wards:", error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log("Starting ward assignment to legacy data...\n");
  await connectDB();
  await assignWardsToExisting();
  await mongoose.disconnect();
  console.log("\n✓ Ward assignment complete!");
};

main();
