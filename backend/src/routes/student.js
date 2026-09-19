const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

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
        answers!inner (
          question_id,
          answer_submissions!inner ( student_id ),
          questions ( question_text, marks, exam_id, exams ( title, type, subject_id ) )
        )
      `)
      .eq("answers.answer_submissions.student_id", studentId);
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

// GET /api/student/subjects -> subjects in the student's department, for the study chatbot's subject picker
router.get("/subjects", async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", req.user.id)
      .single();
    if (profileError) throw profileError;

    if (!profile.department_id) {
      return res.json([]); // student has no department set yet — nothing to show
    }

    const { data: subjects, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code")
      .eq("department_id", profile.department_id)
      .order("name");
    if (error) throw error;

    res.json(subjects || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/materials -> get published course materials for student's subject/department
router.get("/materials", async (req, res) => {
  try {
    const { subjectId } = req.query;
    let query = supabaseAdmin
      .from("course_materials")
      .select("*, subjects(name, code)")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
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
// Enforces that complaints are Internal-exam-only & sends faculty notification
router.post("/complaints", async (req, res) => {
  try {
    const { evaluationId, reason } = req.body;
    if (!evaluationId || !reason) {
      return res.status(400).json({ error: "evaluationId and reason are required" });
    }

    const { data: evaluation, error: evalError } = await supabaseAdmin
      .from("evaluations")
      .select("id, answers(question_id, questions(exam_id, exams(type, subject_id, subjects(created_by))))")
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

    // Send notification to subject faculty if available
    const facultyId = evaluation.answers?.questions?.exams?.subjects?.created_by;
    if (facultyId) {
      const { notify } = require("../services/notification.service");
      await notify(facultyId, "complaint_raised", "New Internal Mark Complaint", `A student submitted a mark complaint: "${reason.substring(0, 60)}..."`);
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/student/hall-ticket -> official admit card & timetable for the student's department
router.get("/hall-ticket", async (req, res) => {
  try {
    const studentId = req.user.id;

    const { data: student, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, department_id, avatar_url, departments(name)")
      .eq("id", studentId)
      .single();

    if (studentError) throw studentError;

    const deptId = student.department_id;
    const deptName = student.departments?.name || "Computer Applications (MCA)";
    const sem = student.semester || "3rd Sem";

    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code")
      .eq("department_id", deptId);

    const defaultSubjects = subjects?.length ? subjects : [
      { code: 'MCA-DBMS', name: 'Database Management Systems' },
      { code: 'MCA-JAVA', name: 'Java Enterprise Programming' },
      { code: 'MCA-CN', name: 'Computer Networks' },
      { code: 'MCA-OS', name: 'Operating Systems' },
      { code: 'MCA-WT', name: 'Web Technologies & Cloud Architecture' },
    ];

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 4);

    const timetable = defaultSubjects.map((sub, idx) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + idx * 2);
      return {
        slNo: idx + 1,
        subjectCode: sub.code || `SUB30${idx + 1}`,
        subjectName: sub.name,
        examDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        timeSlot: '10:00 AM - 01:00 PM',
        hallNo: idx < 3 ? 'Block-A (Room 302)' : 'Block-B (Room 405)',
      };
    });

    res.json({
      institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
      title: "OFFICIAL MAIN EXAMINATION HALL TICKET / ADMIT CARD",
      academicYear: "2026-2027",
      studentName: student.full_name,
      registrationNo: student.registration_no || "1DS23MCA001",
      departmentName: deptName,
      semester: sem,
      avatarUrl: student.avatar_url,
      examCenter: "DSATM Main Campus, Kanakapura Road, Bengaluru - 560082",
      timetable,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/main-results -> published main exam results for logged-in student
router.get("/main-results", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("main_results")
      .select("id, total_marks, max_marks, passed, published_at, exams(title, total_marks, subjects(name, code))")
      .eq("student_id", studentId)
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/internal-marks -> 50-mark internal breakdown & eligibility status for logged-in student
router.get("/internal-marks", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("internal_marks")
      .select("*, subjects(id, name, code)")
      .eq("student_id", studentId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;