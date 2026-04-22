/****************************************************
 * PAYMENT ROUTES
 * Handles Stripe checkout session creation
 * for ticket purchases made through the platform
 ****************************************************/

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/****************************************************
 * POST /api/payments/create-checkout-session
 * Creates a Stripe checkout session
 ****************************************************/
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { event, ticket } = req.body || {};


    /****************************************************
     * VALIDATION
     ****************************************************/
    if (!event || !ticket) {
      return res.status(400).json({
        ok: false,
        message: "Event and ticket data are required."
      });
    }

    if (!event.title || !ticket.unitPrice || !ticket.qty) {
      return res.status(400).json({
        ok: false,
        message: "Invalid event or ticket data."
      });
    }

    /****************************************************
     * CREATE STRIPE SESSION
     ****************************************************/
    const qty = Number(ticket.qty || 1);
    const unitPrice = Number(ticket.unitPrice || 0);

    const subTotal = unitPrice * qty;
    const bookingFee = subTotal * 0.10;
    const total = subTotal + bookingFee;

    const eventSummary = [
      event.venue,
      event.location,
      event.date ? new Date(event.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) : null,
      ticket.ticketType ? `${ticket.ticketType} x${qty}` : null
    ].filter(Boolean).join(" • ");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${event.artist}, ${event.title} (${ticket.ticketType})`,
              description: eventSummary
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],

      success_url:
        process.env.FRONTEND_URL + "/SuccessPayment.html",
      cancel_url:
        process.env.FRONTEND_URL + "/Payment.html"
    });

    return res.json({
      ok: true,
      url: session.url
    });

  } catch (err) {
    console.error("Stripe error:", err.message);

    return res.status(500).json({
      ok: false,
      message: "Stripe error"
    });
  }
});

module.exports = router;