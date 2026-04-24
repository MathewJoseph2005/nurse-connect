import mongoose from "mongoose";

const nurseRemovalSchema = new mongoose.Schema(
  {
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    nurse_name: { type: String, required: true },
    removed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    removed_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const NurseRemoval = mongoose.model("NurseRemoval", nurseRemovalSchema, "nurse_removals");
