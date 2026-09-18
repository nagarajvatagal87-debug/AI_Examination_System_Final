const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const evaluationService = require("../services/evaluation.service.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/evaluations/:id -> full detail for the teacher evaluation screen
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

// GET /api/evaluations/submissions/:submissionId -> all question evaluations for one student's paper
router.get("/submissions/:submissionId", requireRole("faculty", "hod"), async (req, res) => {
  try {
    const data = await evaluationService.getSubmissionEvaluations(req.params.submissionId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// POST /api/evaluations/:id/verify  body: { finalMarks }
router.post("/:id/verify", requireRole("faculty"), async (req, res) => {
  try {
    const data = await evaluationService.verifyEvaluation({
      evaluationId: req.params.id,
      finalMarks: req.body.finalMarks,
      actorId: req.user.id,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// POST /api/evaluations/submissions/:submissionId/publish -> INDIVIDUAL student result publish
router.post("/submissions/:submissionId/publish", requireRole("faculty"), async (req, res) => {
  try {
    const result = await evaluationService.publishSubmission({
      submissionId: req.params.submissionId,
      actorId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;