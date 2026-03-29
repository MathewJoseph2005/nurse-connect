import mongoose from "mongoose";

const headNurseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, unique: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const HeadNurse = mongoose.model("HeadNurse", headNurseSchema, "head_nurses");
