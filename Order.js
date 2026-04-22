/****************************************************
 * ORDER MODEL
 * Stores completed ticket purchases for both
 * logged-in users and guest checkouts
 ****************************************************/

const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    /****************************************************
     * USER (LOGGED-IN)
     ****************************************************/
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    userEmail: {
      type: String,
      default: null
    },

    userRole: {
      type: String,
      default: "customer"
    },

    /****************************************************
     * GUEST DETAILS (if not logged in)
     ****************************************************/
    guestEmail: { type: String, default: null },
    guestName:  { type: String, default: null },
    guestPhone: { type: String, default: null },

    /****************************************************
     * EVENT INFO
     ****************************************************/
    eventId:    { type: String, required: true },
    eventTitle: { type: String, required: true },
    eventDate:  { type: Date,   required: true },
    venue:      { type: String, required: true },
    location:   { type: String, required: true },

    /****************************************************
     * TICKET INFO
     ****************************************************/
    ticketType: { type: String, required: true },
    qty:        { type: Number, required: true },
    unitPrice:  { type: Number, required: true },

    /****************************************************
     * PRICING
     ****************************************************/
    subTotal:   { type: Number, required: true },
    bookingFee: { type: Number, required: true },
    total:      { type: Number, required: true },

    /****************************************************
     * ADDITIONAL FIELDS (FIXED)
     ****************************************************/
    capacity: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["paid", "pending", "cancelled"],
      default: "paid"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", OrderSchema);