import mongoose from "mongoose";

const headNurseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    gender: { type: String, enum: ["male", "female", "other", null], default: null },
    division_id: { type: mongoose.Schema.Types.ObjectId, ref: "Division", default: null },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    ward_id: { type: mongoose.Schema.Types.ObjectId, ref: "Ward", default: null },
    exam_score_percentage: { type: Number, default: null },
    experience_years: { type: Number, default: 0 },
    photo_url: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const HeadNurse = mongoose.model("HeadNurse", headNurseSchema, "head_nurses");
