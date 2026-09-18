const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const axios = require("axios");

const router = express.Router();

router.use(requireAuth, requireRole("student"));

// GET /api/student/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const studentId = req.user.id;

    const { data: marks, error: marksError } = await supabaseAdmin
      .from("evaluations")
      .select(`
        final_marks,
        ai_suggested_marks,
        answers (
          question_id,
          questions ( question_text, marks, exam_id, exams ( title, type, subject_id ) )
        )
      `)
      .eq("answers.submission_id.student_id", studentId);
    if (marksError) throw marksError;

    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("student_insights")
      .select("subject_id, strong_topics, weak_topics, generated_at")
      .eq("student_id", studentId)
      .order("generated_at", { ascending: false });
    if (insightsError) throw insightsError;

    res.json({ profile: req.user, marks: marks || [], insights: insights || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/complaints
router.get("/complaints", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("complaints")
    .select("*")
    .eq("student_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/student/complaints  body: { evaluationId, reason }
router.post("/complaints", async (req, res) => {
  const { evaluationId, reason } = req.body;
  if (!evaluationId || !reason) {
    return res.status(400).json({ error: "evaluationId and reason are required" });
  }

  const { data, error } = await supabaseAdmin
    .from("complaints")
    .insert({ student_id: req.user.id, evaluation_id: evaluationId, reason, status: "open" })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});
// POST /api/student/complaints  body: { evaluationId, reason }
router.post("/complaints", async (req, res) => {
  try {
    const { evaluationId, reason } = req.body;
    if (!evaluationId || !reason) {
      return res.status(400).json({ error: "evaluationId and reason are required" });
    }

    // Enforce: only Internal exams support the complaint workflow
    const { data: evaluation, error: evalError } = await supabaseAdmin
      .from("evaluations")
      .select("id, answers(question_id, questions(exam_id, exams(type)))")
      .eq("id", evaluationId)
      .single();
    if (evalError) throw evalError;

    const examType = evaluation.answers?.questions?.exams?.type;
    if (examType !== "internal") {
      return res.status(403).json({ error: "Complaints can only be raised for Internal exams" });
    }

    const { data, error } = await supabaseAdmin
      .from("complaints")
      .insert({ student_id: req.user.id, evaluation_id: evaluationId, reason, status: "open" })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post("/generate-insights", async (req, res) => {
  try {
    const { data } = await axios.post(
      `${process.env.GENAI_SERVICE_URL}/agents/insights`,
      { student_id: req.user.id, subject_id: req.body.subjectId || null },
      { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
    );
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.detail || err.message });
  }
});

module.exports = router;