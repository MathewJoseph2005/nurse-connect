import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    description: { type: String, default: null },
    entity_type: { type: String, default: null },
    entity_id: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema, "activity_logs");
