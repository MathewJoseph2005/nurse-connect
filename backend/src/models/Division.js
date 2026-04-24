import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const Division = mongoose.model("Division", divisionSchema, "divisions");
