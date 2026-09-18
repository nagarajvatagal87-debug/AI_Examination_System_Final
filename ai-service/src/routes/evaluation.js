const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/evaluations/:id -> full detail for the teacher evaluation screen
// (original OCR text, question, marks, rubric, AI suggestion, confidence)
router.get("/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      id, ai_suggested_marks, ai_confidence, ai_evidence, final_marks, verified_by, verified_at,
      answers (
        ocr_text, ocr_confidence, diagram_detected,
        questions ( question_text, marks, rubric, exam_id )
      )
    `)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

module.exports = router;