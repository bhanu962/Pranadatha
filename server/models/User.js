/**
 * User Model
 * Supports roles: donor, patient, hospital, admin
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
    },
    role: {
      type: String,
      enum: ['donor', 'patient', 'hospital', 'admin'],
      default: 'patient',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    city: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    lastLoginAt: { type: Date },
    // Donor-specific fields
    isAvailable: { type: Boolean, default: true },
    lastDonationDate: { type: Date },
    totalDonations: { type: Number, default: 0 },
    donorLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze',
    },
    medicalEligible: { type: Boolean, default: true },
    medicalNotes: { type: String, select: false },
    // Hospital-specific
    hospitalName: { type: String },
    hospitalAddress: { type: String },
    licenseNumber: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ location: '2dsphere' });
userSchema.index({ bloodGroup: 1, isAvailable: 1, role: 1 });
// Note: email index is already created by unique:true above

// Virtual: next eligible donation date (90 days after last)
userSchema.virtual('nextEligibleDate').get(function () {
  if (!this.lastDonationDate) return null;
  const next = new Date(this.lastDonationDate);
  next.setDate(next.getDate() + 90);
  return next;
});

// Virtual: is currently eligible
userSchema.virtual('isEligible').get(function () {
  if (!this.medicalEligible) return false;
  if (!this.lastDonationDate) return true;
  const daysSinceLastDonation =
    (Date.now() - this.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastDonation >= 90;
});

// Pre-save: hash password + update donor level
userSchema.pre('save', async function () {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  // Update donor level
  if (this.role === 'donor') {
    if (this.totalDonations >= 10) this.donorLevel = 'gold';
    else if (this.totalDonations >= 4) this.donorLevel = 'silver';
    else this.donorLevel = 'bronze';
  }
});

// Method: compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method: generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

// Method: generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

module.exports = mongoose.model('User', userSchema);
