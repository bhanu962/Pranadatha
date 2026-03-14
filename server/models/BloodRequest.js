/**
 * Blood Request Model
 * Emergency blood requests from patients and hospitals
 */
const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsRequired: {
      type: Number,
      required: [true, 'Units required'],
      min: [1, 'At least 1 unit required'],
      max: [20, 'Maximum 20 units per request'],
    },
    unitsFulfilled: { type: Number, default: 0 },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: { type: String, trim: true },
    urgencyLevel: {
      type: String,
      enum: ['critical', 'urgent', 'normal'],
      default: 'urgent',
    },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'expired', 'cancelled'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
    },
    description: { type: String, maxlength: 500 },
    respondedDonors: [
      {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        respondedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'donated'],
          default: 'pending',
        },
      },
    ],
    notificationsSent: { type: Number, default: 0 },
    fulfilledAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for geo-search and filtering
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ bloodGroup: 1, status: 1 });
bloodRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual: is request still active
bloodRequestSchema.virtual('isActive').get(function () {
  return this.status === 'active' && this.expiresAt > new Date();
});

// Virtual: fulfillment percentage
bloodRequestSchema.virtual('fulfillmentPercent').get(function () {
  if (!this.unitsRequired) return 0;
  return Math.min(100, Math.round((this.unitsFulfilled / this.unitsRequired) * 100));
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
