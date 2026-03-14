/**
 * Notification Controller
 * Handles push subscription management and push notification triggers
 */
const Subscription = require('../models/Subscription');
const { sendToUser, buildPayload } = require('../services/pushService');
const logger = require('../utils/logger');

// POST /api/notifications/subscribe - Save push subscription
exports.subscribe = async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
    }

    await Subscription.findOneAndUpdate(
      { user: req.user._id, 'subscription.endpoint': subscription.endpoint },
      {
        user: req.user._id,
        subscription,
        userAgent: userAgent || req.headers['user-agent'],
        isActive: true,
        lastUsed: new Date(),
        failedAttempts: 0,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Push subscription saved.' });
  } catch (error) {
    logger.error(`Subscribe error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to save subscription.' });
  }
};

// DELETE /api/notifications/unsubscribe - Remove push subscription
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await Subscription.findOneAndDelete({
      user: req.user._id,
      'subscription.endpoint': endpoint,
    });
    res.json({ success: true, message: 'Unsubscribed from push notifications.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unsubscribe.' });
  }
};

// POST /api/notifications/test - Send a test notification to current user
exports.sendTestNotification = async (req, res) => {
  try {
    const payload = {
      title: '🩸 Test Notification',
      body: 'Blood Donor Finder push notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test',
      data: { url: '/dashboard', type: 'test' },
    };

    const result = await sendToUser(req.user._id.toString(), payload);
    if (result.total === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscriptions found. Enable notifications first.',
      });
    }

    res.json({ success: true, message: `Test notification sent to ${result.sent}/${result.total} devices.` });
  } catch (error) {
    logger.error(`Test notification error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to send test notification.' });
  }
};

// GET /api/notifications/public-key - Get VAPID public key
exports.getPublicKey = async (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
  });
};

// GET /api/notifications/subscriptions - Admin: list all subscriptions
exports.getSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions: subs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions.' });
  }
};
