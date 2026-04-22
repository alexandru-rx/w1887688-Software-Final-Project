/****************************************************
 * RESET PASSWORD EMAIL UTILITY
 * Sends secure password reset emails using Nodemailer
 * with both plain text and HTML formats
 ****************************************************/

const nodemailer = require("nodemailer");

/****************************************************
 * MAIL TRANSPORTER
 * Uses Gmail credentials stored in environment variables
 ****************************************************/
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/****************************************************
 * SEND RESET EMAIL
 * Sends both plain text and HTML email versions
 ****************************************************/
async function sendResetEmail({ to, name, resetLink }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured. Missing EMAIL_USER or EMAIL_PASS.");
  }

  if (!to || !resetLink) {
    throw new Error("Missing required email fields: to and resetLink.");
  }

  const recipientName = name || "User";

  const mailOptions = {
    from: `"Ticket Wizard" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Ticket Wizard Password 🔐",

    text: [
      `Hello ${recipientName},`,
      "",
      "We received a request to reset your password.",
      "",
      "Use the link below to set a new password:",
      resetLink,
      "",
      "This link expires in 15 minutes.",
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "Ticket Wizard"
    ].join("\n"),

    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2>Ticket Wizard 🔐</h2>
        <p>Hello ${recipientName},</p>
        <p>We received a request to reset your password.</p>
        <p>
          <a
            href="${resetLink}"
            style="display:inline-block;padding:10px 16px;background:#5b21b6;color:#fff;text-decoration:none;border-radius:6px;"
          >
            Reset Password
          </a>
        </p>
        <p>This link expires in <strong>15 minutes</strong>.</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p><strong>Ticket Wizard</strong></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendResetEmail;