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

// Department Schema
const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const Department = mongoose.model("Department", departmentSchema, "departments");

const seedDepartments = async () => {
  try {
    // Clear existing departments
    await Department.deleteMany({});
    console.log("✓ Cleared existing departments");

    // Insert new departments
    const docs = DEPARTMENTS.map((name) => ({ name }));
    const result = await Department.insertMany(docs);
    console.log(`✓ Seeded ${result.length} departments:\n`);
    
    result.forEach((dept) => {
      console.log(`  - ${dept.name} (ID: ${dept._id})`);
    });
  } catch (error) {
    console.error("✗ Error seeding departments:", error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log("Starting department seeding...\n");
  await connectDB();
  await seedDepartments();
  await mongoose.disconnect();
  console.log("\n✓ Department seeding complete!");
};

main();
