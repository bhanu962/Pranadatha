/**
 * Donation Record Model
 * Tracks individual donation history for donors
 */
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
    },
    camp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camp',
    },
    donationType: {
      type: String,
      enum: ['emergency', 'camp', 'voluntary'],
      default: 'voluntary',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    units: { type: Number, default: 1, min: 1, max: 5 },
    donationDate: { type: Date, default: Date.now },
    hospitalName: { type: String, trim: true },
    location: { type: String, trim: true },
    certificateUrl: { type: String },
    notes: { type: String, maxlength: 300 },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

donationSchema.index({ donor: 1, donationDate: -1 });
donationSchema.index({ bloodGroup: 1 });

module.exports = mongoose.model('Donation', donationSchema);
