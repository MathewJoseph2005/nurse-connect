import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DEPARTMENTS = [
  "Caritas Cancer Institute",
  "Caritas Heart Institute",
  "Caritas Neuro Sciences",
  "Critical Care Medicine",
  "Dermatology & Cosmetology",
  "Emergency Medicine & Trauma Care",
  "Gastro Sciences",
  "General Medicine",
  "General Surgery",
  "Nephrology & Renal Transplant",
  "Obstetrics & Gynaecology",
  "Orthopaedics & Joint Replacement",
  "Paediatrics & Paediatric Surgery",
  "Physical Medicine & Rehabilitation",
  "Rheumatology",
  "Urology",
];

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

const Department = mongoose.model("Department", new mongoose.Schema({ name: String }), "departments");
const Ward = mongoose.model("Ward", new mongoose.Schema({ 
  name: String, 
  department_id: mongoose.Schema.Types.ObjectId 
}), "wards");

const seedWards = async () => {
  try {
    // Clear existing wards
    await Ward.deleteMany({});
    console.log("✓ Cleared existing wards");

    const depts = await Department.find({}).lean();
    if (depts.length === 0) {
      console.log("! No departments found. Please seed departments first.");
      return;
    }

    const wardsToInsert = [];

    for (const dept of depts) {
      const deptName = dept.name;
      let wardPrefix = "W";
      let count = 6;

      if (deptName === "Dermatology & Cosmetology") {
        wardPrefix = "D";
      } else if (deptName.includes("Cancer")) {
        wardPrefix = "C";
      } else if (deptName.includes("Heart")) {
        wardPrefix = "H";
      } else if (deptName.includes("Neuro")) {
        wardPrefix = "N";
      } else if (deptName.includes("Critical")) {
        wardPrefix = "ICU";
      } else if (deptName.includes("Emergency")) {
        wardPrefix = "ER";
      }

      for (let i = 1; i <= count; i++) {
        wardsToInsert.push({
          name: `${wardPrefix}${i}`,
          department_id: dept._id,
        });
      }
    }

    const result = await Ward.insertMany(wardsToInsert);
    console.log(`✓ Seeded ${result.length} wards across ${depts.length} departments.`);
  } catch (error) {
    console.error("✗ Error seeding wards:", error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log("Starting ward seeding...\n");
  await connectDB();
  await seedWards();
  await mongoose.disconnect();
  console.log("\n✓ Ward seeding complete!");
};

main();
