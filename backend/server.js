/****************************************************
 * TICKET WIZARD BACKEND SERVER
 * Main Express server configuration
 ****************************************************/

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const eventRoutes = require("./routes/events");
const paymentRoutes = require("./routes/payment");

const app = express();

/****************************************************
 * FRONTEND ORIGINS
 * Allow local frontend pages to access backend API
 ****************************************************/
const FRONTEND_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

/****************************************************
 * MIDDLEWARE: CORS
 * - Allows requests from local frontend
 * - credentials:true is required for sessions/cookies
 ****************************************************/
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // tools like Postman
      if (FRONTEND_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);

/****************************************************
 * MIDDLEWARE: PREFLIGHT HANDLER
 * Handles browser OPTIONS requests before real request
 ****************************************************/
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/****************************************************
 * MIDDLEWARE: JSON BODY PARSER
 ****************************************************/
app.use(express.json());

/****************************************************
 * MIDDLEWARE: SESSION SETUP
 * Stores logged-in user session in cookie-based session
 ****************************************************/
app.use(
  session({
    name: "ticketwizard.sid",
    secret: process.env.SESSION_SECRET || "ticketwizard_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false // local development over http
    }
  })
);

/****************************************************
 * BASIC HEALTH CHECK ROUTES
 ****************************************************/
app.get("/", (req, res) => {
  res.send("Ticketing Backend Running");
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, msg: "pong" });
});

/****************************************************
 * API ROUTES
 ****************************************************/
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/payments", paymentRoutes);

/****************************************************
 * DATABASE CONNECTION
 ****************************************************/
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

/****************************************************
 * START SERVER
 ****************************************************/
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
