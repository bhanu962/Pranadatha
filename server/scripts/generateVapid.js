#!/usr/bin/env node
/**
 * VAPID Key Generator Script
 * Run: node scripts/generateVapid.js
 * Outputs VAPID keys to add to your .env file
 */
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n══════════════════════════════════════════════════════');
console.log('  🔑  VAPID Keys Generated Successfully');
console.log('══════════════════════════════════════════════════════\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=your-email@example.com`);
console.log('\n══════════════════════════════════════════════════════');
console.log('  ⚠️  Keep your PRIVATE KEY secret! Never commit it.');
console.log('  📋  Copy the PUBLIC KEY to your frontend .env too.');
console.log('══════════════════════════════════════════════════════\n');

// Also write to a temporary file for convenience
const fs = require('fs');
const output = `# Generated VAPID Keys - ${new Date().toISOString()}
# Add to your .env file (server)
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=your-email@example.com

# Add to your .env file (client)
VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
`;

fs.writeFileSync('./vapid-keys.txt', output);
console.log('Keys also saved to: server/vapid-keys.txt (add to .gitignore!)');
