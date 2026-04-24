import "dotenv/config";
import mongoose from "mongoose";

const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const MONGO_URI = (preferDirect && process.env.MONGODB_URI_DIRECT) || process.env.MONGODB_URI;

if (!MONGO_URI) throw new Error("No MongoDB URI in backend/.env");

const opts = { strict: false };
const Nurse = mongoose.model("Nurse", new mongoose.Schema({ name: String, division_id: mongoose.Schema.Types.ObjectId, exam_score_percentage: Number }, opts), "nurses");
const Division = mongoose.model("Division", new mongoose.Schema({ name: String, acuity_level: Number }, opts), "divisions");

const ACUITY_SCORES = [10, 27, 48, 75]; // Scores for acuity 1-4

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const divisions = await Division.find().sort({ acuity_level: 1 });
  if (divisions.length === 0) {
    console.error("❌ No acuity levels found. Run: npm run seed-acuity");
    process.exit(1);
  }

  // Find all nurses
  const nurses = await Nurse.find({});
  console.log(`Found ${nurses.length} nurses. Checking for missing acuity...`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < nurses.length; i++) {
    const nurse = nurses[i];
    
    // Assign acuity in a round-robin fashion so it distributes them evenly
    const acuityIdx = i % divisions.length;
    const division = divisions[acuityIdx];
    const score = ACUITY_SCORES[acuityIdx];

    // If they already have this division and score, skip
    if (nurse.division_id && nurse.division_id.toString() === division._id.toString() && nurse.exam_score_percentage === score) {
      skipped++;
      continue;
    }

    nurse.division_id = division._id;
    nurse.exam_score_percentage = score;
    await nurse.save();
    
    console.log(`   ✅ Updated ${nurse.name} -> ${division.name} (Score: ${score})`);
    updated++;
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ Done! Updated: ${updated} | Skipped (already correct): ${skipped}`);
  
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
