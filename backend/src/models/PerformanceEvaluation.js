import mongoose from "mongoose";

const performanceEvaluationSchema = new mongoose.Schema(
  {
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse", required: true },
    evaluated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendance_score: { type: Number, default: null },
    reliability_score: { type: Number, default: null },
    quality_score: { type: Number, default: null },
    overall_score: { type: Number, default: null },
    remarks: { type: String, default: null },
    evaluation_period: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export const PerformanceEvaluation = mongoose.model("PerformanceEvaluation", performanceEvaluationSchema, "performance_evaluations");
