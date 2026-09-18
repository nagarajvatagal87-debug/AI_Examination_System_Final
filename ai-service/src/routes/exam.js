const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/exams?subjectId=...
router.get("/", async (req, res) => {
  const { subjectId } = req.query;
  let query = supabaseAdmin
    .from("exams")
    .select("id, type, title, total_marks, subject_id, paper_file_path, created_at")
    .order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/exams/:id -> exam with its full question paper (for PDF export / review)
router.get("/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("exams")
    .select("*, questions(*)")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

module.exports = router;