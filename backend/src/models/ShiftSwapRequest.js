import mongoose from "mongoose";

const shiftSwapRequestSchema = new mongoose.Schema(
  {
    requester_nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    target_nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    requester_schedule_id: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
    target_schedule_id: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    review_notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const ShiftSwapRequest = mongoose.model("ShiftSwapRequest", shiftSwapRequestSchema, "shift_swap_requests");
