/**
 * seed-acuity.mjs
 * Replaces any existing division records with 4 fixed Acuity levels.
 * Run with: node scripts/seed-acuity.mjs
 *
 * Acuity scale (based on exam score):
 *   Score  0–19  → Acuity 1
 *   Score 20–34  → Acuity 2
 *   Score 35–60  → Acuity 3
 *   Score  60+   → Acuity 4
 */
import "dotenv/config";
import mongoose from "mongoose";

const ACUITY_LEVELS = [
  { name: "Acuity 1", description: "Score 0–19: Low complexity patient care", acuity_level: 1 },
  { name: "Acuity 2", description: "Score 20–34: Moderate complexity care", acuity_level: 2 },
  { name: "Acuity 3", description: "Score 35–60: High complexity care", acuity_level: 3 },
  { name: "Acuity 4", description: "Score 60+: Critical / intensive care", acuity_level: 4 },
];

const divisionSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, unique: true },
    description:   { type: String, default: null },
    acuity_level:  { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const Division = mongoose.model("Division", divisionSchema, "divisions");

async function main() {
const preferDirect = process.env.MONGODB_PREFER_DIRECT === "true";
const uri =
  (preferDirect && process.env.MONGODB_URI_DIRECT) ||
  process.env.MONGODB_URI;

if (!uri) throw new Error("No MongoDB URI found. Set MONGODB_URI or MONGODB_URI_DIRECT in backend/.env");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  for (const level of ACUITY_LEVELS) {
    const existing = await Division.findOne({ name: level.name });
    if (existing) {
      // Update description and acuity_level in case it's stale
      await Division.updateOne({ _id: existing._id }, { $set: { description: level.description, acuity_level: level.acuity_level } });
      console.log(`  Updated: ${level.name}`);
    } else {
      await Division.create(level);
      console.log(`  Created: ${level.name}`);
    }
  }

  console.log("✅ Acuity levels seeded successfully.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
