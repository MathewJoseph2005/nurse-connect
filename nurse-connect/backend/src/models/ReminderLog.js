import mongoose from "mongoose";

/**
 * ReminderLog — tracks which (scheduleId, reminderType) pairs have already
 * had a notification inserted, so we never double-send across server restarts.
 *
 * reminderType values:
 *   "day_before"   — evening before the duty day (20:00 local)
 *   "thirty_min"   — 30 minutes before shift start
 */
const reminderLogSchema = new mongoose.Schema(
  {
    schedule_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
    reminder_type: { type: String, required: true },   // "day_before" | "thirty_min"
    sent_at:       { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reminderLogSchema.index({ schedule_id: 1, reminder_type: 1 }, { unique: true });

export const ReminderLog = mongoose.model("ReminderLog", reminderLogSchema, "reminder_logs");
