import mongoose from "mongoose";

const userRoleSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "head_nurse", "nurse"], required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

userRoleSchema.index({ user_id: 1, role: 1 }, { unique: true });

export const UserRole = mongoose.model("UserRole", userRoleSchema, "user_roles");
