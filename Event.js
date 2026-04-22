/****************************************************
 * EVENT MODEL
 * Stores event details, ticket types and
 * promoter-created listings for the platform
 ****************************************************/

const mongoose = require("mongoose");

/****************************************************
 * TICKET TYPE SUB-SCHEMA
 * Each event can contain multiple ticket types
 * such as Standard, VIP, Early Entry, etc.
 ****************************************************/
const TicketTypeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    capacity: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false } // prevent extra Mongo subdocument IDs for ticket types
);

/****************************************************
 * EVENT SCHEMA
 ****************************************************/
const EventSchema = new mongoose.Schema(
  {
    /****************************************************
     * BASIC EVENT DETAILS
     ****************************************************/
    artist: {
      type: String,
      required: true,
      trim: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    venue: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    /****************************************************
     * GENRE INFORMATION
     ****************************************************/
    genre: {
      type: String,
      default: ""
    },

    mainGenre: {
      type: String,
      default: ""
    },

    subGenre: {
      type: String,
      default: ""
    },

    /****************************************************
     * DATE / TIME
     ****************************************************/
    date: {
      type: Date,
      required: true
    },

    time: {
      type: String,
      default: ""
    },

    /****************************************************
     * PRICING / CAPACITY
     ****************************************************/
    price: {
      type: Number,
      default: 0,
      min: 0
    },

    capacity: {
      type: Number,
      default: 0,
      min: 0
    },

    /****************************************************
     * EXTRA EVENT DETAILS
     ****************************************************/
    description: {
      type: String,
      default: ""
    },

    image: {
      type: String,
      default: ""
    },

    promoterEmail: {
      type: String,
      default: ""
    },

    /****************************************************
     * NESTED TICKET TYPES
     ****************************************************/
    ticketTypes: {
      type: [TicketTypeSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", EventSchema);