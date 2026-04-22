/****************************************************
 * AUTH ROUTES
 * Handles register, login, logout, session, profile,
 * forgot password, and reset password logic
 ****************************************************/

const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const sendResetEmail = require("../utils/sendResetEmail");

const router = express.Router();

/****************************************************
 * HELPER: SAFE USER OBJECT
 * Never send passwordHash to frontend
 ****************************************************/
function safeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone || ""
  };
}

/****************************************************
 * HELPER: PASSWORD STRENGTH CHECK
 * Enforces minimum password security rules
 ****************************************************/
function isStrongPassword(password) {
  const value = String(password || "").trim();

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

/****************************************************
 * REGISTER
 * POST /api/auth/register
 ****************************************************/
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "fullName, email and password are required."
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        ok: false,
        message: "Password is too weak."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "Email already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "customer"
    });

    req.session.user = safeUser(user);

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Failed to save session."
        });
      }

      return res.json({
        ok: true,
        user: req.session.user
      });
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * UPDATE PROFILE
 * PUT /api/auth/update-profile
 ****************************************************/
router.put("/update-profile", async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({
        ok: false,
        message: "Not authenticated"
      });
    }

    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        ok: false,
        message: "Email is required"
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.session.user.id }
    });

    if (existing) {
      return res.status(400).json({
        ok: false,
        message: "Email already in use"
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      { email: normalizedEmail },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        message: "User not found"
      });
    }

    req.session.user = safeUser(updatedUser);

    return res.json({
      ok: true,
      user: req.session.user
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * LOGIN
 * POST /api/auth/login
 ****************************************************/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "email and password are required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    req.session.user = safeUser(user);

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Failed to save session."
        });
      }

      return res.json({
        ok: true,
        user: req.session.user
      });
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * CURRENT SESSION USER
 * GET /api/auth/me
 ****************************************************/
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ ok: false });
  }

  return res.json({
    ok: true,
    user: req.session.user
  });
});

/****************************************************
 * LOGOUT
 * POST /api/auth/logout
 ****************************************************/
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

/****************************************************
 * FORGOT PASSWORD
 * POST /api/auth/forgot-password
 ****************************************************/
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email is required."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Do not reveal whether email exists
    if (!user) {
      return res.json({
        ok: true,
        message: "If this email exists, a reset link has been sent."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "http://127.0.0.1:5500/frontend";
    const resetLink = `${frontendBase}/reset-password.html?token=${token}`;

    await sendResetEmail({
      to: user.email,
      name: user.fullName,
      resetLink
    });

    return res.json({
      ok: true,
      message: "If this email exists, a reset link has been sent."
    });
  } catch (err) {
    console.error("forgot-password error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }
});

/****************************************************
 * RESET PASSWORD
 * POST /api/auth/reset-password
 ****************************************************/
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        ok: false,
        message: "Token and password are required."
      });
    }

    const trimmedPassword = String(password).trim();

    if (!isStrongPassword(trimmedPassword)) {
      return res.status(400).json({
        ok: false,
        message: "Password is too weak."
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        message: "Invalid or expired token"
      });
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10);

    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    return res.json({
      ok: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }
});

module.exports = router;