const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const evaluationService = require("../services/evaluation.service.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/exams?subjectId=... -> List internal assessment examinations
router.get("/", async (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = supabaseAdmin
      .from("exams")
      .select("id, type, title, total_marks, subject_id, status, paper_file_path, created_at, created_by, subjects(id, name, code, department_id)")
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    } else if (req.user?.role === "faculty") {
      // If faculty user didn't specify subjectId, check faculty's assigned subjects or created exams
      const { data: mySubs } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .eq("faculty_id", req.user.id);
      
      const mySubIds = (mySubs || []).map((s) => s.id);
      if (mySubIds.length > 0) {
        query = query.or(`subject_id.in.(${mySubIds.join(",")}),created_by.eq.${req.user.id}`);
      } else {
        query = query.eq("created_by", req.user.id);
      }
    }

    const { data: exams, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const departmentIds = [...new Set((exams || []).map((e) => e.subjects?.department_id).filter(Boolean))];
    const { data: allStudents } = departmentIds.length
      ? await supabaseAdmin.from("profiles").select("id, department_id").eq("role", "student").in("department_id", departmentIds)
      : { data: [] };

    const withCounts = (exams || []).map((e) => ({
      ...e,
      subjectName: e.subjects?.name || 'Subject',
      subjectCode: e.subjects?.code || 'ACAD',
      studentCount: (allStudents || []).filter((s) => s.department_id === e.subjects?.department_id).length,
    }));

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id -> Exam with its full question paper and subject details
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select("*, subjects(id, name, code, department_id), questions(*)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ error: error?.message || "Exam not found" });

    // Order questions by question_no
    if (Array.isArray(data.questions)) {
      data.questions.sort((a, b) => (a.question_no || 0) - (b.question_no || 0));
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/exams/questions/:id -> Update question text & marks
router.put("/questions/:id", requireRole("faculty"), async (req, res) => {
  const { questionText, marks } = req.body;
  const { data, error } = await supabaseAdmin
    .from("questions")
    .update({ question_text: questionText, marks: Number(marks) })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/exams/questions/:id -> Remove a question
router.delete("/questions/:id", requireRole("faculty"), async (req, res) => {
  const { error } = await supabaseAdmin.from("questions").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ status: "deleted" });
});

// GET /api/exams/:examId/students
router.get("/:examId/students", requireAuth, requireRole("faculty", "hod"), async (req, res) => {
  try {
    const result = await evaluationService.getExamStudents(req.params.examId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// GET /api/exams/:examId/analytics
router.get("/:examId/analytics", requireAuth, requireRole("faculty", "hod"), async (req, res) => {
  try {
    const result = await evaluationService.getExamAnalytics(req.params.examId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;