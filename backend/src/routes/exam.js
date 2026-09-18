const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const evaluationService = require("../services/evaluation.service.js");

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

// PUT /api/exams/questions/:id  body: { questionText, marks }
router.put("/questions/:id", requireRole("faculty"), async (req, res) => {
  const { questionText, marks } = req.body;
  const { data, error } = await supabaseAdmin
    .from("questions")
    .update({ question_text: questionText, marks })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/exams/questions/:id -- remove a bad question before finalizing
router.delete("/questions/:id", requireRole("faculty"), async (req, res) => {
  const { error } = await supabaseAdmin.from("questions").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ status: "deleted" });
});
router.get("/:examId/students", requireAuth, requireRole("faculty", "hod"), async (req, res) => {
  try {
    const result = await evaluationService.getExamStudents(req.params.examId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/exam/:examId/analytics
router.get("/:examId/analytics", requireAuth, requireRole("faculty", "hod"), async (req, res) => {
  try {
    const result = await evaluationService.getExamAnalytics(req.params.examId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});
// GET /api/exams?subjectId=...  (now includes student_count and status)
router.get("/", async (req, res) => {
  const { subjectId } = req.query;
  let query = supabaseAdmin
    .from("exams")
    .select("id, type, title, total_marks, subject_id, status, paper_file_path, created_at, subjects(name, department_id)")
    .order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);

  const { data: exams, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const departmentIds = [...new Set(exams.map((e) => e.subjects?.department_id).filter(Boolean))];
  const { data: allStudents } = departmentIds.length
    ? await supabaseAdmin.from("profiles").select("id, department_id").eq("role", "student").in("department_id", departmentIds)
    : { data: [] };

  const withCounts = exams.map((e) => ({
    ...e,
    subjectName: e.subjects?.name || '—',
    studentCount: (allStudents || []).filter((s) => s.department_id === e.subjects?.department_id).length,
  }));

  res.json(withCounts);
});

module.exports = router;