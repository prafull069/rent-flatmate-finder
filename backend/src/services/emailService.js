const nodemailer = require("nodemailer");
const prisma = require("../config/db");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Sends an email and logs it to the Notification table.
 * Never throws — email failures must not break the request that triggered them.
 */
async function sendNotification({ userId, to, type, subject, html, payload }) {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`Failed to send email (type=${type}) to ${to}:`, err.message);
  }

  try {
    await prisma.notification.create({
      data: { userId, type, payload: payload || {} },
    });
  } catch (err) {
    console.error("Failed to log notification:", err.message);
  }
}

async function notifyOwnerHighScoreInterest({ owner, tenant, listing, score }) {
  await sendNotification({
    userId: owner.id,
    to: owner.email,
    type: "HIGH_SCORE_INTEREST",
    subject: `Strong match interested in your listing (${score}% compatible)`,
    html: `<p>Hi ${owner.name},</p>
      <p><strong>${tenant.name}</strong> has expressed interest in your listing at
      <strong>${listing.location}</strong>. Their compatibility score is
      <strong>${score}/100</strong> — one of your stronger matches.</p>
      <p>Log in to review and respond to this request.</p>`,
    payload: { listingId: listing.id, tenantId: tenant.id, score },
  });
}

async function notifyTenantInterestDecision({ tenant, listing, status }) {
  const verb = status === "ACCEPTED" ? "accepted" : "declined";
  await sendNotification({
    userId: tenant.id,
    to: tenant.email,
    type: "INTEREST_DECISION",
    subject: `Your interest was ${verb}`,
    html: `<p>Hi ${tenant.name},</p>
      <p>The owner has <strong>${verb}</strong> your interest in the listing at
      <strong>${listing.location}</strong>.</p>
      ${status === "ACCEPTED" ? "<p>You can now chat with the owner directly on the platform.</p>" : ""}`,
    payload: { listingId: listing.id, status },
  });
}

module.exports = { sendNotification, notifyOwnerHighScoreInterest, notifyTenantInterestDecision };
