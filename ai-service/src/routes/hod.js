const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();

router.use(requireAuth, requireRole("hod"));

// GET /api/hod/overview -> department-wide subjects + top performers
router.get("/overview", async (req, res) => {
  try {
    const { data: hodProfile, error: hodError } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", req.user.id)
      .single();
    if (hodError) throw hodError;

    const departmentId = hodProfile.department_id;

    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, faculty_id")
      .eq("department_id", departmentId);
    if (subjectsError) throw subjectsError;

    const subjectIds = subjects.map((s) => s.id);

    // rankings link to exams, and exams link to subjects — so fetch exam ids first
    const { data: exams, error: examsError } = await supabaseAdmin
      .from("exams")
      .select("id")
      .in("subject_id", subjectIds.length ? subjectIds : ["00000000-0000-0000-0000-000000000000"]);
    if (examsError) throw examsError;

    const examIds = exams.map((e) => e.id);

    const { data: topStudents, error: rankError } = await supabaseAdmin
      .from("rankings")
      .select("total_marks, rank_in_department, exam_id, student_id, profiles(full_name, registration_no)")
      .in("exam_id", examIds.length ? examIds : ["00000000-0000-0000-0000-000000000000"])
      .order("rank_in_department", { ascending: true })
      .limit(10);
    if (rankError) throw rankError;

    res.json({ department_id: departmentId, subjects, top_students: topStudents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;