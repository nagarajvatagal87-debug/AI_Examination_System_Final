const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const axios = require("axios");

const router = express.Router();
// Deliberately NO requireAuth here — this whole file is the public, no-login section.

// GET /api/public/college-info -> general sections (overview, admissions, contact, etc.)
router.get("/college-info", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("college_info").select("section, content");
  if (error) return res.status(500).json({ error: error.message });

  // Flatten into { overview: {...}, admissions: {...} } shape for easy frontend use
  const bySection = {};
  for (const row of data) bySection[row.section] = row.content;
  res.json(bySection);
});

// GET /api/public/departments -> list of departments (name only, no sensitive data)
router.get("/departments", async (req, res) => {
  const { data, error } = await supabaseAdmin.from("departments").select("id, name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/public/departments/:id -> full public profile for one department
router.get("/departments/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("department_public_info")
    .select(`
      about, student_count, courses, fees, placement_percentage,
      highest_package, average_package, achievements, facilities,
      departments ( name )
    `)
    .eq("department_id", req.params.id)
    .eq("published", true) // <-- the privacy rule enforced here
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "This department has no published public information." });
  }
  res.json(data);
});
router.post("/chat", async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question) return res.status(400).json({ error: "question is required" });

    const { data } = await axios.post(
      `${process.env.GENAI_SERVICE_URL}/agents/public-chat`,
      { question, history: history || [] },
      { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
    );

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.detail || err.message });
  }
});
module.exports = router;