/**
 * Authentication Controller
 * Handles register, login, profile, email verification, password reset
 */
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { generateToken, generateRefreshToken } = require('../middleware/authMiddleware');
const { checkEligibility } = require('../services/eligibilityService');
const logger = require('../utils/logger');

// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    user: userObj,
  });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, bloodGroup, city, latitude, longitude } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const userData = {
      name,
      email,
      password,
      phone,
      role: role || 'patient',
      bloodGroup,
      city,
    };

    // Set location if provided
    if (latitude && longitude) {
      userData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const user = await User.create(userData);
    logger.info(`New user registered: ${user.email} (${user.role})`);
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const eligibility = req.user.role === 'donor' ? checkEligibility(user) : null;
    res.json({ success: true, user, eligibility });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

// PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'city', 'bloodGroup', 'isAvailable', 'medicalEligible'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Update location if coordinates provided
    if (req.body.latitude && req.body.longitude) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    // Optionally deactivate push subscriptions on logout
    await Subscription.updateMany({ user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};
