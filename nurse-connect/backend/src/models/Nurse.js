import mongoose from "mongoose";

const nurseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, unique: true, sparse: true },
    name: { type: String, required: true },
    age: { type: Number, default: null },
    phone: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["male", "female", "other", null], default: null },
    division_id: { type: mongoose.Schema.Types.ObjectId, ref: "Division", default: null },
    current_department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    previous_departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
    exam_score_percentage: { type: Number, default: null },
    experience_years: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    photo_url: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const Nurse = mongoose.model("Nurse", nurseSchema, "nurses");
