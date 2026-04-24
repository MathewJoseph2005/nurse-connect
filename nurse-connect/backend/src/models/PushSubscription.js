import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

pushSubscriptionSchema.index({ user_id: 1, endpoint: 1 }, { unique: true });

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema, "push_subscriptions");
