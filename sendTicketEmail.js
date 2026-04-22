/****************************************************
 * TICKET EMAIL UTILITY
 * Sends order confirmation emails with ticket
 * details and embedded QR codes where available
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
 * SEND TICKET EMAIL
 * - Sends order summary
 * - Embeds QR codes inline in HTML email where available
 ****************************************************/
async function sendTicketEmail({ to, order, tickets }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured. Missing EMAIL_USER or EMAIL_PASS.");
  }

  if (!to || !order || !Array.isArray(tickets)) {
    throw new Error("Missing required ticket email data.");
  }

  const attachments = [];
  const ticketHtmlBlocks = [];

  tickets.forEach((ticket, index) => {
    const cid = `ticketqr${index}@ticketwizard`;

    const hasEmbeddedQr =
      ticket.qrCode &&
      typeof ticket.qrCode === "string" &&
      ticket.qrCode.startsWith("data:image/png;base64,");

    if (hasEmbeddedQr) {
      const base64Data = ticket.qrCode.replace(/^data:image\/png;base64,/, "");

      attachments.push({
        filename: `ticket-${ticket._id}.png`,
        content: base64Data,
        encoding: "base64",
        cid
      });

      ticketHtmlBlocks.push(`
        <div style="margin-bottom: 28px; padding: 16px; border: 1px solid #ddd; border-radius: 10px;">
          <h3 style="margin: 0 0 10px 0;">Ticket ${index + 1}</h3>
          <p style="margin: 6px 0;"><strong>Event:</strong> ${ticket.eventTitle}</p>
          <p style="margin: 6px 0;"><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
          <p style="margin: 6px 0;"><strong>Ticket ID:</strong> ${ticket._id}</p>
          <img
            src="cid:${cid}"
            alt="QR Code"
            style="width: 180px; height: 180px; margin-top: 10px;"
          />
        </div>
      `);
    } else {
      ticketHtmlBlocks.push(`
        <div style="margin-bottom: 28px; padding: 16px; border: 1px solid #ddd; border-radius: 10px;">
          <h3 style="margin: 0 0 10px 0;">Ticket ${index + 1}</h3>
          <p style="margin: 6px 0;"><strong>Event:</strong> ${ticket.eventTitle}</p>
          <p style="margin: 6px 0;"><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
          <p style="margin: 6px 0;"><strong>Ticket ID:</strong> ${ticket._id}</p>
        </div>
      `);
    }
  });

  const formattedDate = order.eventDate
    ? new Date(order.eventDate).toLocaleString()
    : "N/A";

  const mailOptions = {
    from: `"Ticket Wizard" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Ticket Wizard Tickets 🎟️",

    text: [
      "Hello,",
      "",
      "Thank you for your purchase!",
      "",
      `Event: ${order.eventTitle || "N/A"}`,
      `Venue: ${order.venue || "N/A"}`,
      `Location: ${order.location || "N/A"}`,
      `Date: ${formattedDate}`,
      "",
      "Your QR tickets are included in this email.",
      "",
      "Please present the QR code at entry.",
      "",
      "Enjoy the event!",
      "",
      "Ticket Wizard"
    ].join("\n"),

    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2>Ticket Wizard 🎟️</h2>
        <p>Hello,</p>
        <p>Thank you for your purchase!</p>

        <p><strong>Event:</strong> ${order.eventTitle || "N/A"}</p>
        <p><strong>Venue:</strong> ${order.venue || "N/A"}</p>
        <p><strong>Location:</strong> ${order.location || "N/A"}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>

        <h3 style="margin-top: 24px;">Your Tickets</h3>
        ${ticketHtmlBlocks.join("")}

        <p>Please present the QR code at entry.</p>
        <p>Enjoy the event!</p>
        <p><strong>Ticket Wizard</strong></p>
      </div>
    `,

    attachments
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendTicketEmail;