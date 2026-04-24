import mongoose from "mongoose";

const nurseLeaveSchema = new mongoose.Schema(
  {
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    leave_date: { type: String, required: true },
    reason: { type: String, default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

nurseLeaveSchema.index({ nurse_id: 1, leave_date: 1 }, { unique: true });

export const NurseLeave = mongoose.model("NurseLeave", nurseLeaveSchema, "nurse_leaves");
