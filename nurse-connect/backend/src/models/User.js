import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "head_nurse", "nurse"], required: true },
    name: { type: String, required: true },
    username: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
