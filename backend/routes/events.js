/****************************************************
 * EVENTS ROUTES
 * Handles event retrieval and promoter event
 * management, including create, update and delete
 ****************************************************/

const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

/****************************************************
 * PROMOTER ACCESS CHECK
 * Only logged-in promoters can modify event data
 ****************************************************/
function requirePromoter(req, res) {
  if (req.session.user?.role !== "promoter") {
    res.status(403).json({
      ok: false,
      message: "Forbidden"
    });
    return false;
  }

  return true;
}

/****************************************************
 * GET ALL EVENTS
 * GET /api/events
 * - Returns all events sorted by date
 * - Public route for customers and promoters
 ****************************************************/
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    return res.json({
      ok: true,
      events
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * CREATE EVENT
 * POST /api/events
 * - Promoter only
 ****************************************************/
router.post("/", async (req, res) => {
  try {
    if (!requirePromoter(req, res)) return;

    const event = await Event.create(req.body);

    return res.json({
      ok: true,
      event
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * UPDATE EVENT
 * PUT /api/events/:id
 * - Promoter only
 ****************************************************/
router.put("/:id", async (req, res) => {
  try {
    if (!requirePromoter(req, res)) return;

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: "Event not found"
      });
    }

    return res.json({
      ok: true,
      event: updated
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/****************************************************
 * DELETE EVENT
 * DELETE /api/events/:id
 * - Promoter only
 ****************************************************/
router.delete("/:id", async (req, res) => {
  try {
    if (!requirePromoter(req, res)) return;

    const deleted = await Event.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        message: "Event not found"
      });
    }

    return res.json({
      ok: true,
      message: "Event deleted successfully"
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

module.exports = router;
