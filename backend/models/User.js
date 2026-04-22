/****************************************************
 * USER MODEL
 * Stores user accounts for authentication system
 * Supports:
 * - Customers
 * - Promoters
 ****************************************************/

const mongoose = require("mongoose");

/****************************************************
 * USER SCHEMA
 ****************************************************/
const userSchema = new mongoose.Schema(
  {
    /****************************************************
     * BASIC USER DETAILS
     ****************************************************/
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    /****************************************************
     * SECURITY
     * Stores hashed password (never plain text)
     ****************************************************/
    passwordHash: {
      type: String,
      required: true
    },

    /****************************************************
     * USER ROLE
     * Determines access level in system
     ****************************************************/
    role: {
      type: String,
      enum: ["customer", "promoter"],
      default: "customer"
    },

    /****************************************************
     * OPTIONAL PROFILE DATA
     ****************************************************/
    phone: {
      type: String,
      default: ""
    },

    /****************************************************
     * PASSWORD RESET SYSTEM
     ****************************************************/
    resetToken: {
      type: String,
      default: null
    },

    resetTokenExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/****************************************************
 * EXPORT MODEL
 ****************************************************/
module.exports = mongoose.model("User", userSchema);
