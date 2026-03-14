/**
 * Push Notification Service
 * Handles Web Push Protocol notifications using VAPID + web-push
 */
const { webpush } = require('../config/vapid');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

/**
 * Check if VAPID is configured and web-push is ready to use
 */
const isVapidConfigured = () => {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_EMAIL
  );
};

/**
 * Send a push notification to a single subscription
 */
const sendToSubscription = async (subscription, payload) => {
  if (!isVapidConfigured()) {
    logger.warn('Push skipped: VAPID not configured.');
    return false;
  }
  try {
    await webpush.sendNotification(
      subscription.subscription,
      JSON.stringify(payload)
    );
    // Update last used
    await Subscription.findByIdAndUpdate(subscription._id, {
      lastUsed: new Date(),
      failedAttempts: 0,
    });
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired - remove it
      await Subscription.findByIdAndDelete(subscription._id);
      logger.info(`Removed invalid subscription ${subscription._id}`);
    } else {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { failedAttempts: 1 },
      });
      // Deactivate after 5 consecutive failures
      if (subscription.failedAttempts >= 4) {
        await Subscription.findByIdAndUpdate(subscription._id, { isActive: false });
      }
      logger.error(`Push send error for ${subscription._id}: ${error.message}`);
    }
    return false;
  }
};

/**
 * Send push notification to a specific user (all their active devices)
 */
const sendToUser = async (userId, payload) => {
  if (!isVapidConfigured()) return { sent: 0, total: 0 };

  const subscriptions = await Subscription.find({
    user: userId,
    isActive: true,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendToSubscription(sub, payload))
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  return { sent, total: subscriptions.length };
};

/**
 * Broadcast push notification to multiple users
 */
const broadcast = async (userIds, payload) => {
  if (!isVapidConfigured()) return 0;

  const results = await Promise.allSettled(
    userIds.map((uid) => sendToUser(uid, payload))
  );
  const totalSent = results.reduce((acc, r) => {
    if (r.status === 'fulfilled') acc += r.value.sent;
    return acc;
  }, 0);
  logger.info(`Broadcast: sent ${totalSent} notifications to ${userIds.length} users`);
  return totalSent;
};

/**
 * Build notification payload for different trigger types
 */
const buildPayload = (type, data = {}) => {
  const payloads = {
    emergency_request: {
      title: '🚨 Emergency Blood Needed!',
      body: `${data.bloodGroup} blood needed at ${data.hospital}. Can you help?`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `emergency-${data.requestId}`,
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: {
        url: `/requests/${data.requestId}`,
        type: 'emergency_request',
        requestId: data.requestId,
      },
      actions: [
        { action: 'accept', title: '✅ I can donate' },
        { action: 'dismiss', title: '❌ Not now' },
      ],
    },
    request_matched: {
      title: '💉 Donor Responded to Your Request',
      body: `A donor ${data.distance || 'nearby'} responded to your ${data.bloodGroup} blood request at ${data.hospital}!`,
      icon: '/icons/icon-192x192.png',
      tag: `matched-${data.requestId}`,
      data: { url: `/requests/${data.requestId}`, type: 'request_matched' },
    },
    camp_reminder: {
      title: '📅 Donation Camp Reminder',
      body: `"${data.campTitle}" starts tomorrow at ${data.location}. Don't forget!`,
      icon: '/icons/icon-192x192.png',
      tag: `camp-${data.campId}`,
      data: { url: `/camps/${data.campId}`, type: 'camp_reminder' },
    },
    eligibility_reminder: {
      title: '🎉 You\'re Eligible to Donate Again!',
      body: '90 days have passed since your last donation. Lives need you!',
      icon: '/icons/icon-192x192.png',
      tag: 'eligibility',
      data: { url: '/donor-dashboard', type: 'eligibility_reminder' },
    },
    request_fulfilled: {
      title: '✅ Blood Request Fulfilled',
      body: `Your ${data.bloodGroup} blood request at ${data.hospital} has been fulfilled. Thank you!`,
      icon: '/icons/icon-192x192.png',
      tag: `fulfilled-${data.requestId}`,
      data: { url: `/requests/${data.requestId}`, type: 'request_fulfilled' },
    },
  };

  return payloads[type] || {
    title: 'Blood Donor Finder',
    body: 'New notification',
    icon: '/icons/icon-192x192.png',
  };
};

module.exports = { sendToUser, broadcast, buildPayload, sendToSubscription, isVapidConfigured };
