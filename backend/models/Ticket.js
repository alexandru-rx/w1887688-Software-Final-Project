/****************************************************
 * TICKET MODEL
 * Stores individual tickets generated per order,
 * including QR codes and validation status
 ****************************************************/

const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    /****************************************************
     * ORDER LINK
     * Each ticket belongs to one order
     ****************************************************/
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Order"
    },

    /****************************************************
     * EVENT DETAILS
     ****************************************************/
    eventId: {
      type: String,
      required: true
    },

    eventTitle: {
      type: String,
      required: true
    },

    /****************************************************
     * TICKET DETAILS
     ****************************************************/
    ticketType: {
      type: String,
      required: true
    },

    qrCode: {
      type: String,
      required: true
    },

    /****************************************************
     * VALIDATION STATUS
     * false = not yet used
     * true  = already scanned at entry
     ****************************************************/
    used: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Ticket", TicketSchema);
