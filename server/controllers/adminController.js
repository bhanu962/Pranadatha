/**
 * Admin Controller
 * Analytics, user management, request moderation
 */
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Donation = require('../models/Donation');
const Camp = require('../models/Camp');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

// GET /api/admin/stats - Dashboard statistics
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

    // Blood group breakdown
    const bloodGroupStats = await User.aggregate([
      { $match: { role: 'donor', isActive: true } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly request trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const requestTrend = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          fulfilled: { $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Urgency breakdown
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
          ? parseFloat(((fulfilledRequests / totalRequests) * 100).toFixed(1))
          : 0,
      },
      bloodGroupStats,
      requestTrend,
      urgencyBreakdown,
    });
  } catch (error) {
    logger.error(`Admin stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

// GET /api/admin/users - List all users
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
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, pagination: { page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

// PUT /api/admin/users/:id/toggle-active - Activate/deactivate user
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

// PUT /api/admin/requests/:id/moderate - Admin moderation
exports.moderateRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'approve', 'reject', 'expire'
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (action === 'expire') request.status = 'expired';
    else if (action === 'cancel') request.status = 'cancelled';
    else if (action === 'reactivate') request.status = 'active';

    await request.save();
    res.json({ success: true, message: `Request ${action}d.`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to moderate request.' });
  }
};

// GET /api/admin/geographic-data - Donor distribution by city
exports.getGeographicData = async (req, res) => {
  try {
    const cityDistribution = await User.aggregate([
      { $match: { role: 'donor', isActive: true, city: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$city',
          donors: { $sum: 1 },
          available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
        },
      },
      { $sort: { donors: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, cityDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch geographic data.' });
  }
};
