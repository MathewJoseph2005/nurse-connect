import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    shift_type: { type: String, enum: ["morning", "evening", "night"], required: true },
    duty_date: { type: String, required: true },
    week_number: { type: Number, required: true },
    year: { type: Number, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

scheduleSchema.index({ nurse_id: 1, duty_date: 1 }, { unique: true });

export const Schedule = mongoose.model("Schedule", scheduleSchema, "schedules");
