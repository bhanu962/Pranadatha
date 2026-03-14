/**
 * Push Notification Subscription Model
 * Stores browser push subscription objects (Web Push API)
 */
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
    userAgent: { type: String },
    isActive: { type: Boolean, default: true },
    lastUsed: { type: Date, default: Date.now },
    failedAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate subscriptions per user
subscriptionSchema.index({ user: 1, 'subscription.endpoint': 1 }, { unique: true });
subscriptionSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
