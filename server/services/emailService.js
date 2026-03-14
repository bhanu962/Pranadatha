/**
 * Email Service — Pranadatha
 * Transactional emails via Brevo SMTP (nodemailer)
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// ── Shared brand header / footer ──────────────────────────────────────────
const brandHeader = `
  <div style="background:#c62828;padding:20px 32px;border-radius:12px 12px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:1px;">
            🩸 Pranadatha
          </span>
          <br/>
          <span style="font-size:11px;color:#ffcdd2;letter-spacing:2px;text-transform:uppercase;">
            Giving the Gift of Life
          </span>
        </td>
      </tr>
    </table>
  </div>
`;

const brandFooter = `
  <div style="background:#1a1a1a;padding:18px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="color:#9e9e9e;font-size:12px;margin:0;">
      Pranadatha &nbsp;·&nbsp; Saving lives, one drop at a time
    </p>
    <p style="color:#616161;font-size:11px;margin:6px 0 0;">
      If you did not initiate this action, you can safely ignore this email.
    </p>
  </div>
`;

const wrapEmail = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
    ${brandHeader}
    <div style="background:#fff;padding:32px;">
      ${body}
    </div>
    ${brandFooter}
  </div>
</body>
</html>
`;

// ── Send helper ────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const from = `"${process.env.FROM_NAME || 'Pranadatha'}" <${
    process.env.FROM_EMAIL || 'noreply@pranadatha.in'
  }>`;
  const info = await transporter.sendMail({ from, to, subject, html, text });
  logger.info(`[Email] Sent: ${info.messageId} → ${to} (${subject})`);
  return info;
};

// ── Password Reset ─────────────────────────────────────────────────────────
const sendPasswordResetEmail = async (to, name, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">Password Reset Request</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      We received a request to reset your Pranadatha account password.
      Click the button below to set a new password:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}"
         style="background:#c62828;color:#fff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        🔐 Reset My Password
      </a>
    </div>
    <p style="color:#888;font-size:13px;">
      This link expires in <strong>10 minutes</strong>.<br/>
      Or copy this link: <a href="${resetUrl}" style="color:#c62828;word-break:break-all;">${resetUrl}</a>
    </p>
  `);
  return sendEmail({ to, subject: '🔐 Password Reset — Pranadatha', html });
};

// ── Email Verification ─────────────────────────────────────────────────────
const sendVerificationEmail = async (to, name, verifyToken) => {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${verifyToken}`;
  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">Verify Your Email</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>, welcome to <strong>Pranadatha</strong>! 🎉</p>
    <p style="color:#555;line-height:1.6;">
      Please verify your email address to activate your account and start saving lives.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}"
         style="background:#c62828;color:#fff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ✅ Verify My Email
      </a>
    </div>
    <p style="color:#888;font-size:13px;">
      This link expires in <strong>24 hours</strong>.
    </p>
  `);
  return sendEmail({ to, subject: '✅ Verify Your Email — Pranadatha', html });
};

// ── Account Deleted by Admin ───────────────────────────────────────────────
const sendAccountDeletedEmail = async (to, name, reason) => {
  const html = wrapEmail(`
    <h2 style="color:#b71c1c;margin:0 0 8px;">Account Removed</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      Your Pranadatha account associated with <strong>${to}</strong> has been removed
      by an administrator.
    </p>
    ${reason ? `<p style="color:#555;line-height:1.6;"><strong>Reason:</strong> ${reason}</p>` : ''}
    <p style="color:#555;line-height:1.6;">
      If you believe this was a mistake, please contact us at
      <a href="mailto:support@pranadatha.in" style="color:#c62828;">support@pranadatha.in</a>.
    </p>
  `);
  return sendEmail({ to, subject: 'Your Pranadatha account has been removed', html });
};

// ── Account Modified by Admin ──────────────────────────────────────────────
const sendAccountModifiedEmail = async (to, name, changes) => {
  const changeList = Object.entries(changes)
    .map(([k, v]) => `<li style="color:#555;">${k}: <strong>${v}</strong></li>`)
    .join('');
  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">Account Updated</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      An administrator has updated your Pranadatha account with the following changes:
    </p>
    <ul style="padding-left:20px;">${changeList}</ul>
    <p style="color:#555;line-height:1.6;">
      If you did not expect these changes, contact us at
      <a href="mailto:support@pranadatha.in" style="color:#c62828;">support@pranadatha.in</a>.
    </p>
  `);
  return sendEmail({ to, subject: 'Your Pranadatha account has been updated', html });
};

// ── Welcome Email (on registration) ──────────────────────────────────────
const sendWelcomeEmail = async (to, name, role) => {
  const roleMsg = {
    donor:    'As a donor, you can respond to urgent blood requests and save lives directly.',
    patient:  'You can post blood requests and connect with nearby volunteer donors.',
    hospital: 'You can post emergency blood requests and manage donations for your facility.',
    admin:    'You have full admin access to manage the platform.',
  }[role] || 'Welcome to our life-saving community!';

  const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`;
  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">Welcome to Pranadatha! 🎉</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      Thank you for joining <strong>Pranadatha</strong> — the platform that connects blood donors
      with those who need it most. Every drop counts!
    </p>
    <p style="color:#555;line-height:1.6;">${roleMsg}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}"
         style="background:#c62828;color:#fff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        🚀 Go to Dashboard
      </a>
    </div>
    <p style="color:#888;font-size:13px;">
      Need help? Contact us at
      <a href="mailto:support@pranadatha.in" style="color:#c62828;">support@pranadatha.in</a>
    </p>
  `);
  return sendEmail({ to, subject: '🎉 Welcome to Pranadatha — Let’s Save Lives Together!', html });
};

// ── Temporary Password (forgot password) ──────────────────────────────────
const sendTempPasswordEmail = async (to, name, tempPassword) => {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">Temporary Password</h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      We received a password reset request for your Pranadatha account.
      Use the temporary password below to log in, then change your password immediately.
    </p>
    <div style="background:#f5f5f5;border-left:4px solid #c62828;border-radius:8px;
                padding:16px 24px;margin:20px 0;text-align:center;">
      <p style="color:#616161;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Temporary Password</p>
      <p style="color:#c62828;font-size:28px;font-weight:900;letter-spacing:4px;margin:0;font-family:monospace;">${tempPassword}</p>
    </div>
    <div style="text-align:center;margin:20px 0;">
      <a href="${loginUrl}"
         style="background:#c62828;color:#fff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        🔐 Log In &amp; Change Password
      </a>
    </div>
    <p style="color:#e53935;font-size:13px;font-weight:600;">
      ⚠️ This temporary password expires in 15 minutes. Change it immediately after login.
    </p>
  `);
  return sendEmail({ to, subject: '🔐 Your Pranadatha Temporary Password', html });
};

// ── Blood Request Alert (notify matching donors by email) ─────────────────
const sendBloodRequestAlertEmail = async (to, donorName, request) => {
  const { bloodGroup, hospitalName, urgencyLevel, address, contactPhone, _id } = request;
  const urgencyColors = { critical: '#b71c1c', urgent: '#e65100', normal: '#2e7d32' };
  const color = urgencyColors[urgencyLevel] || '#c62828';
  const requestUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/requests/${_id}`;

  const html = wrapEmail(`
    <h2 style="color:#212121;margin:0 0 8px;">🚨 Urgent Blood Needed — <span style="color:${color};">${bloodGroup}</span></h2>
    <p style="color:#555;line-height:1.6;">Hi <strong>${donorName}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
      Your blood group <strong style="color:#c62828;">${bloodGroup}</strong> is urgently needed!
      A patient at <strong>${hospitalName}</strong> requires blood. Your donation could save a life.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <span style="color:#9e9e9e;font-size:12px;">Blood Group</span><br/>
          <strong style="color:#c62828;font-size:20px;">${bloodGroup}</strong>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <span style="color:#9e9e9e;font-size:12px;">Hospital</span><br/>
          <strong style="color:#212121;">${hospitalName}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="color:#9e9e9e;font-size:12px;">Urgency</span><br/>
          <strong style="color:${color};text-transform:uppercase;">${urgencyLevel}</strong>
        </td>
        <td style="padding:8px 0;">
          <span style="color:#9e9e9e;font-size:12px;">Location</span><br/>
          <strong style="color:#212121;">${address || 'See request details'}</strong>
        </td>
      </tr>
    </table>
    ${contactPhone ? `<p style="color:#555;">Contact: <a href="tel:${contactPhone}" style="color:#c62828;font-weight:700;">${contactPhone}</a></p>` : ''}
    <div style="text-align:center;margin:24px 0;">
      <a href="${requestUrl}"
         style="background:#c62828;color:#fff;padding:14px 32px;border-radius:8px;
                text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        🩸 View Request &amp; Respond
      </a>
    </div>
    <p style="color:#888;font-size:12px;">
      You are receiving this because your blood group matches this request.
      To stop these alerts, update your availability in your dashboard.
    </p>
  `);
  return sendEmail({ to, subject: `🚨 ${bloodGroup} Blood Needed at ${hospitalName} — Pranadatha`, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendTempPasswordEmail,
  sendBloodRequestAlertEmail,
  sendAccountDeletedEmail,
  sendAccountModifiedEmail,
};
