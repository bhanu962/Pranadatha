/**
 * Donation Camp Model
 * Events organized for blood donation drives
 */
const mongoose = require('mongoose');

const campSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Camp title is required'],
      trim: true,
      maxlength: 150,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizerName: { type: String, required: true },
    description: { type: String, maxlength: 1000 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], required: true }, // [lon, lat]
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    bloodGroupsNeeded: {
      type: [String],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'All'],
      default: ['All'],
    },
    expectedDonors: { type: Number, default: 50 },
    registeredDonors: [
      {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        registeredAt: { type: Date, default: Date.now },
        attended: { type: Boolean, default: false },
      },
    ],
    contactPhone: { type: String },
    contactEmail: { type: String },
    banner: { type: String },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    remindersSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

campSchema.index({ location: '2dsphere' });
campSchema.index({ startDate: 1, status: 1 });
campSchema.index({ city: 1 });

campSchema.virtual('registrationCount').get(function () {
  return this.registeredDonors ? this.registeredDonors.length : 0;
});

module.exports = mongoose.model('Camp', campSchema);
