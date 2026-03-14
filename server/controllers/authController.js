/**
 * Authentication Controller
 * Handles register, login, profile, email verification, password reset, token refresh
 */
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { generateToken, generateRefreshToken } = require('../middleware/authMiddleware');
const { checkEligibility } = require('../services/eligibilityService');
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendTempPasswordEmail,
} = require('../services/emailService');
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

    // Send verification email and welcome email (best-effort)
    setImmediate(async () => {
      try {
        const vToken = user.generateEmailVerificationToken();
        await user.save({ validateBeforeSave: false });
        await sendVerificationEmail(user.email, user.name, vToken);
      } catch (e) {
        logger.warn(`Verification email failed for ${user.email}: ${e.message}`);
      }
      try {
        await sendWelcomeEmail(user.email, user.name, user.role);
      } catch (e) {
        logger.warn(`Welcome email failed for ${user.email}: ${e.message}`);
      }
    });

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
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });
    }
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
    // Deactivate push subscriptions on logout
    await Subscription.updateMany({ user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

// POST /api/auth/forgot-password
// Generates a random temporary password, sets it on the account, emails it to the user
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    // Always respond the same to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email is registered, a temporary password has been sent.',
      });
    }

    // Generate a human-readable temporary password: ABC-123456
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const digits = Math.floor(100000 + Math.random() * 900000);
    const tempPassword = `${prefix}-${digits}`;

    // Set the temp password (pre-save hook hashes it)
    user.password = tempPassword;
    // Clear any existing reset tokens
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    try {
      await sendTempPasswordEmail(user.email, user.name, tempPassword);
      logger.info(`Temporary password sent to ${user.email}`);
      res.json({
        success: true,
        message: 'Temporary password sent! Check your inbox and change it after logging in.',
      });
    } catch (emailErr) {
      logger.error(`Temp password email failed: ${emailErr.message}`);
      res.status(500).json({ success: false, message: 'Could not send email. Try again later.' });
    }
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};

// PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Hash token to match stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    logger.info(`Password reset for user: ${user.email}`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for: ${user.email}`);
    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    logger.error(`Verify email error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Email verification failed.' });
  }
};

// POST /api/auth/refresh — Exchange refresh token for a new access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken, user });
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to refresh token.' });
  }
};
