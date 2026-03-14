/**
 * Admin Controller — Pranadatha
 * Dashboard stats, user management (list, edit, delete), request moderation
 */
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Donation = require('../models/Donation');
const Camp = require('../models/Camp');
const Subscription = require('../models/Subscription');
const {
  sendAccountDeletedEmail,
  sendAccountModifiedEmail,
} = require('../services/emailService');
const logger = require('../utils/logger');

// GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers, totalDonors, activeDonors, totalRequests,
      activeRequests, fulfilledRequests, totalDonations,
      totalCamps, totalSubscriptions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'donor', isAvailable: true, isActive: true }),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'active' }),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      Donation.countDocuments(),
      Camp.countDocuments(),
      Subscription.countDocuments({ isActive: true }),
    ]);

    const bloodGroupStats = await User.aggregate([
      { $match: { role: 'donor', isActive: true } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const requestTrend = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          fulfilled: { $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const urgencyBreakdown = await BloodRequest.aggregate([
      { $group: { _id: '$urgencyLevel', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, totalDonors, activeDonors,
        totalRequests, activeRequests, fulfilledRequests,
        totalDonations, totalCamps, totalSubscriptions,
        fulfillmentRate: totalRequests > 0
          ? parseFloat(((fulfilledRequests / totalRequests) * 100).toFixed(1)) : 0,
      },
      bloodGroupStats, requestTrend, urgencyBreakdown,
    });
  } catch (error) {
    logger.error(`Admin stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role, active, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// GET /api/admin/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
};

// PUT /api/admin/users/:id — Edit any user's profile
exports.updateUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    // Prevent editing another admin
    if (target.role === 'admin' && target._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot edit other admin accounts.' });
    }

    const allowed = ['name', 'email', 'phone', 'city', 'bloodGroup', 'role',
      'isActive', 'isAvailable', 'medicalEligible', 'hospitalName'];
    const updates = {};
    const changeLog = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== target[field]) {
        changeLog[field] = req.body[field];
        updates[field] = req.body[field];
      }
    });

    if (!Object.keys(updates).length) {
      return res.json({ success: true, message: 'No changes detected.', user: target });
    }

    // Prevent demoting the last admin
    if (updates.role && updates.role !== 'admin' && target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot change role: this is the only admin account.' });
      }
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    }).select('-password');

    // Notify user of changes (best-effort)
    try {
      await sendAccountModifiedEmail(target.email, target.name, changeLog);
    } catch (e) {
      logger.warn(`Could not send modification email to ${target.email}: ${e.message}`);
    }

    logger.info(`Admin ${req.user.email} updated user ${target.email}: ${JSON.stringify(changeLog)}`);
    res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

// DELETE /api/admin/users/:id — Permanently delete a user account
exports.deleteUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    // Cannot delete own account or another admin
    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    }

    const { reason } = req.body;

    // Clean up related data
    await Promise.all([
      Subscription.deleteMany({ user: target._id }),
      BloodRequest.updateMany(
        { requestedBy: target._id, status: 'active' },
        { status: 'cancelled' }
      ),
    ]);

    await User.findByIdAndDelete(target._id);

    // Notify user of deletion (best-effort)
    try {
      await sendAccountDeletedEmail(target.email, target.name, reason);
    } catch (e) {
      logger.warn(`Could not send deletion email to ${target.email}: ${e.message}`);
    }

    logger.info(`Admin ${req.user.email} deleted user ${target.email} (${target.role})`);
    res.json({ success: true, message: `Account for ${target.name} (${target.email}) has been deleted.` });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

// PUT /api/admin/users/:id/toggle-active
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify admin users.' });
    }
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

// PUT /api/admin/requests/:id/moderate
exports.moderateRequest = async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['approve', 'reject', 'expire', 'cancel', 'reactivate'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    const actionStatusMap = {
      approve: 'active', reject: 'cancelled',
      expire: 'expired', cancel: 'cancelled', reactivate: 'active',
    };
    request.status = actionStatusMap[action];
    await request.save();
    res.json({ success: true, message: `Request ${action}d.`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to moderate request.' });
  }
};

// GET /api/admin/geographic
exports.getGeographicData = async (req, res) => {
  try {
    const cityDistribution = await User.aggregate([
      { $match: { role: 'donor', isActive: true, city: { $exists: true, $ne: '' } } },
      { $group: { _id: '$city', donors: { $sum: 1 }, available: { $sum: { $cond: ['$isAvailable', 1, 0] } } } },
      { $sort: { donors: -1 } },
      { $limit: 20 },
    ]);
    res.json({ success: true, cityDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch geographic data.' });
  }
};
