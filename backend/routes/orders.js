/****************************************************
 * ORDERS ROUTES
 * Handles order creation, ticket generation,
 * ticket validation, PDF downloads and
 * promoter order analytics
 ****************************************************/

const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const User = require("../models/User");
const Ticket = require("../models/Ticket");

const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const sendTicketEmail = require("../utils/sendTicketEmail");

/****************************************************
 * HELPER: GET LOGGED-IN USER FROM SESSION
 ****************************************************/
async function getSessionUser(req) {
  const sessionUserId = req.session?.user?.id;
  if (!sessionUserId) return null;

  return User.findById(sessionUserId).select("_id email role fullName phone");
}

/****************************************************
 * HELPER: SAFE VALUE NORMALISERS
 ****************************************************/
const safeStr = (v) => (v === undefined || v === null ? "" : String(v));

const safeNum = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/****************************************************
 * POST /api/orders
 * Create a new order after payment
 * Supports:
 * - logged-in user
 * - guest checkout
 ****************************************************/
router.post("/", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);

    const {
      guestEmail,
      guestName,
      guestPhone,
      eventId,
      eventTitle,
      eventDate,
      venue,
      location,
      capacity,
      ticketType,
      ticketTypeCapacity,
      qty,
      unitPrice,
      subTotal,
      bookingFee,
      total
    } = req.body || {};

    const isLoggedIn = !!sessionUser;
    const hasGuest = !!guestEmail && !!guestName;

    if (!isLoggedIn && !hasGuest) {
      return res.status(401).json({
        ok: false,
        message: "Login or guest details required."
      });
    }

    if (!eventId || !eventTitle || !eventDate || !venue || !location) {
      return res.status(400).json({
        ok: false,
        message: "Missing event details."
      });
    }

    const parsedEventDate = new Date(eventDate);
    if (Number.isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({
        ok: false,
        message: "Invalid event date."
      });
    }

    const qtyNum = safeNum(qty);
    if (!ticketType || qtyNum < 1) {
      return res.status(400).json({
        ok: false,
        message: "Invalid ticket details."
      });
    }

    if (unitPrice == null || subTotal == null || bookingFee == null || total == null) {
      return res.status(400).json({
        ok: false,
        message: "Missing ticket/pricing details."
      });
    }

    /****************************************************
     * INVENTORY / OVERSELLING PROTECTION
     * Check sold quantity for selected ticket type
     ****************************************************/
    const ticketTypeCapacityNum = safeNum(ticketTypeCapacity);

    if (ticketTypeCapacityNum > 0) {
      const existingOrders = await Order.find({
        eventId: safeStr(eventId),
        ticketType: safeStr(ticketType)
      });

      const ticketsAlreadySoldForType = existingOrders.reduce((sum, o) => {
        return sum + safeNum(o.qty);
      }, 0);

      const ticketsRemainingForType = ticketTypeCapacityNum - ticketsAlreadySoldForType;

      if (qtyNum > ticketsRemainingForType) {
        return res.status(400).json({
          ok: false,
          message: `Not enough ${ticketType} tickets available. Only ${ticketsRemainingForType} remaining.`
        });
      }
    }

    /****************************************************
     * CREATE ORDER
     ****************************************************/
    const order = await Order.create({
      userId: sessionUser?._id || null,
      userEmail: sessionUser?.email || null,
      userRole: sessionUser?.role || "customer",

      guestEmail: isLoggedIn ? null : safeStr(guestEmail),
      guestName: isLoggedIn ? null : safeStr(guestName),
      guestPhone: isLoggedIn ? null : safeStr(guestPhone),

      eventId: safeStr(eventId),
      eventTitle: safeStr(eventTitle),
      eventDate: parsedEventDate,
      venue: safeStr(venue),
      location: safeStr(location),

      ticketType: safeStr(ticketType),
      qty: qtyNum,
      unitPrice: safeNum(unitPrice),

      subTotal: safeNum(subTotal),
      bookingFee: safeNum(bookingFee),
      total: safeNum(total),

      capacity: safeNum(capacity),
      status: "paid"
    });

    /****************************************************
     * GENERATE INDIVIDUAL TICKETS
     ****************************************************/
    const tickets = [];

    for (let i = 0; i < qtyNum; i++) {
      const qrPayload = JSON.stringify({
        orderId: order._id,
        eventId: safeStr(eventId),
        eventTitle: safeStr(eventTitle),
        ticketType: safeStr(ticketType),
        ticketNumber: i + 1
      });

      const qrCodeImage = await QRCode.toDataURL(qrPayload);

      const ticket = await Ticket.create({
        orderId: order._id,
        eventId: safeStr(eventId),
        eventTitle: safeStr(eventTitle),
        ticketType: safeStr(ticketType),
        qrCode: qrCodeImage,
        used: false
      });

      tickets.push(ticket);
    }

    /****************************************************
     * SEND TICKET EMAIL
     ****************************************************/
    const emailTarget = sessionUser?.email || safeStr(guestEmail);

    if (emailTarget) {
      try {
        await sendTicketEmail({
          to: emailTarget,
          order,
          tickets
        });
      } catch (err) {
        console.error("Ticket email failed:", err.message);
      }
    }

    return res.json({
      ok: true,
      order,
      tickets
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * GET /api/orders/my
 * Logged-in users only
 * Returns current user's own orders
 ****************************************************/
router.get("/my", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in."
      });
    }

    const orders = await Order.find({ userId: sessionUser._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      ok: true,
      orders
    });
  } catch (err) {
    console.error("Fetch my orders error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * GET /api/orders/:orderId/tickets
 * Logged-in users can fetch tickets for their own order
 ****************************************************/
router.get("/:orderId/tickets", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in."
      });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: sessionUser._id
    });

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Order not found."
      });
    }

    const tickets = await Ticket.find({ orderId: order._id }).sort({ createdAt: 1 });

    return res.json({
      ok: true,
      tickets
    });
  } catch (err) {
    console.error("Fetch order tickets error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * POST /api/orders/tickets/scan
 * Marks ticket as used on first valid scan
 ****************************************************/
router.post("/tickets/scan", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    const { ticketId } = req.body || {};

    if (!sessionUser || sessionUser.role !== "promoter") {
      return res.status(403).json({
        ok: false,
        message: "Promoter access required."
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        ok: false,
        message: "ticketId is required."
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        message: "Ticket not found."
      });
    }

    if (ticket.used) {
      return res.status(400).json({
        ok: false,
        message: "Ticket already used."
      });
    }

    ticket.used = true;
    await ticket.save();

    return res.json({
      ok: true,
      message: "Ticket valid.",
      ticket
    });
  } catch (err) {
    console.error("Scan ticket error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * GET /api/orders/tickets/:ticketId/pdf
 * Generate downloadable PDF ticket
 ****************************************************/
router.get("/tickets/:ticketId/pdf", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in."
      });
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        message: "Ticket not found."
      });
    }

    const order = await Order.findById(ticket.orderId);
    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Related order not found."
      });
    }

    const ownsOrder = String(order.userId) === String(sessionUser._id);
    const isPromoter = sessionUser.role === "promoter";

    if (!ownsOrder && !isPromoter) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden"
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    const safeTitle = String(ticket.eventTitle || "Ticket").replace(/[^a-z0-9-_]/gi, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}_${ticket._id}.pdf"`
    );

    doc.pipe(res);

    /****************************************************
     * PDF HEADER
     ****************************************************/
    doc.fontSize(24).text("Ticket Wizard", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).text("E-Ticket", { align: "center" });
    doc.moveDown(1.5);

    /****************************************************
     * MAIN TICKET DETAILS
     ****************************************************/
    doc.fontSize(14).text(`Event: ${ticket.eventTitle || "N/A"}`);
    doc.moveDown(0.4);
    doc.text(`Venue: ${order.venue || "N/A"}`);
    doc.moveDown(0.4);
    doc.text(`Location: ${order.location || "N/A"}`);
    doc.moveDown(0.4);
    doc.text(`Date: ${order.eventDate ? new Date(order.eventDate).toLocaleString() : "N/A"}`);
    doc.moveDown(0.4);
    doc.text(`Ticket Type: ${ticket.ticketType || "N/A"}`);
    doc.moveDown(0.4);
    doc.text(`Ticket ID: ${ticket._id}`);
    doc.moveDown(0.4);
    doc.text(`Order Reference: ${order._id}`);
    doc.moveDown(0.4);
    doc.text(`Status: ${ticket.used ? "Used" : "Valid / Unused"}`);

    doc.moveDown(1.5);

    /****************************************************
     * QR CODE
     ****************************************************/
    if (ticket.qrCode && ticket.qrCode.startsWith("data:image/png;base64,")) {
      const qrBase64 = ticket.qrCode.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrBase64, "base64");

      doc.fontSize(14).text("Entry QR Code", { align: "center" });
      doc.moveDown(0.5);

      const qrSize = 180;
      const x = (doc.page.width - qrSize) / 2;

      doc.image(qrBuffer, x, doc.y, {
        fit: [qrSize, qrSize],
        align: "center"
      });

      doc.moveDown(13);
    }

    /****************************************************
     * PDF FOOTER
     ****************************************************/
    doc
      .fontSize(10)
      .text(
        "Please present this ticket at entry. Each ticket is unique and can only be used once.",
        50,
        doc.page.height - 80,
        {
          align: "center",
          width: doc.page.width - 100
        }
      );

    doc.end();
  } catch (err) {
    console.error("Generate ticket PDF error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * GET /api/orders/promoter/stats
 * Logged-in promoters only
 * Returns order data for dashboard analytics
 ****************************************************/
router.get("/promoter/stats", async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);

    if (!sessionUser || sessionUser.role !== "promoter") {
      return res.status(403).json({
        ok: false,
        message: "Promoter access required."
      });
    }

    const orders = await Order.find({}).sort({ createdAt: -1 });

    return res.json({
      ok: true,
      orders
    });
  } catch (err) {
    console.error("Fetch promoter stats error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

module.exports = router;
