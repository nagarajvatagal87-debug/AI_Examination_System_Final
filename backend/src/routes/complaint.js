const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/complaints -> faculty/hod view: pending & all complaints for review
router.get("/", requireRole("faculty", "hod"), async (req, res) => {
  try {
    const { getAllComplaints } = require("../services/complaintStore");
    const data = await getAllComplaints();
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/:id/resolve  body: { approved, extraMarks, resolutionNote }
router.post("/:id/resolve", requireRole("faculty", "hod"), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, extraMarks, resolutionNote } = req.body;

    const { resolveComplaint } = require("../services/complaintStore");
    const updated = await resolveComplaint(id, req.user, { approved, extraMarks, resolutionNote });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;