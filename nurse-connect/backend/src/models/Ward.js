import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    description: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

wardSchema.index({ department_id: 1, name: 1 }, { unique: true });

export const Ward = mongoose.model("Ward", wardSchema, "wards");
