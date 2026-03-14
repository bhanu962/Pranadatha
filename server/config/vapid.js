/**
 * VAPID Configuration for Web Push Notifications
 * Initializes the web-push library with VAPID keys
 */
const webpush = require('web-push');

const initVapid = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
    console.warn(
      '⚠️  VAPID keys not configured. Push notifications will be disabled.\n' +
      '   Run: node scripts/generateVapid.js to generate keys.'
    );
    return;
  }

  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  console.log('✅ VAPID keys configured for Web Push');
};

module.exports = { initVapid, webpush };
