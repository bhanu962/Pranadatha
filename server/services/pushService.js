/**
 * Push Notification Service
 * Handles Web Push Protocol notifications using VAPID + web-push
 */
const { webpush } = require('../config/vapid');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

/**
 * Send a push notification to a single subscription
 * @param {Object} subscription - Subscription document
 * @param {Object} payload - Notification payload
 */
const sendToSubscription = async (subscription, payload) => {
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
      // Subscription is no longer valid - remove it
      await Subscription.findByIdAndDelete(subscription._id);
      logger.info(`Removed invalid subscription ${subscription._id}`);
    } else {
      // Increment failed attempts
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { failedAttempts: 1 },
      });
      // Deactivate after 5 failures
      if (subscription.failedAttempts >= 5) {
        await Subscription.findByIdAndUpdate(subscription._id, { isActive: false });
      }
      logger.error(`Push send error for ${subscription._id}: ${error.message}`);
    }
    return false;
  }
};

/**
 * Send push notification to a specific user
 * @param {string} userId - MongoDB User ID
 * @param {Object} payload - Notification payload
 */
const sendToUser = async (userId, payload) => {
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
 * @param {string[]} userIds - Array of User IDs
 * @param {Object} payload - Notification payload
 */
const broadcast = async (userIds, payload) => {
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
      body: `${data.bloodGroup} blood needed ${data.distance ? data.distance + 'km' : ''} away at ${data.hospital}. Can you help?`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `emergency-${data.requestId}`,
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: {
        url: `/request/${data.requestId}`,
        type: 'emergency_request',
        requestId: data.requestId,
      },
      actions: [
        { action: 'accept', title: '✅ I can donate' },
        { action: 'dismiss', title: '❌ Not now' },
      ],
    },
    request_matched: {
      title: '💉 Blood Request Matched',
      body: `Your ${data.bloodGroup} blood request has a potential donor ${data.distance}km away!`,
      icon: '/icons/icon-192x192.png',
      tag: `matched-${data.requestId}`,
      data: { url: `/request/${data.requestId}`, type: 'request_matched' },
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
      data: { url: '/dashboard', type: 'eligibility_reminder' },
    },
    request_fulfilled: {
      title: '✅ Blood Request Fulfilled',
      body: `Your ${data.bloodGroup} blood request at ${data.hospital} has been fulfilled. Thank you!`,
      icon: '/icons/icon-192x192.png',
      tag: `fulfilled-${data.requestId}`,
      data: { url: `/request/${data.requestId}`, type: 'request_fulfilled' },
    },
  };

  return payloads[type] || { title: 'Blood Donor Finder', body: 'New notification', icon: '/icons/icon-192x192.png' };
};

module.exports = { sendToUser, broadcast, buildPayload, sendToSubscription };
