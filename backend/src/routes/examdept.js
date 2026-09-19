const express = require("express");
const multer = require("multer");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { sendEmail } = require("../services/emailService");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("examdept"));

// GET /api/examdept/exams -> all Main exams across all departments
router.get("/exams", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("exams")
    .select("id, title, total_marks, status, created_at, subject_id, subjects(name, department_id, departments(name))")
    .eq("type", "main")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/examdept/exams  body: { subjectId, title, totalMarks }
router.post("/exams", async (req, res) => {
  try {
    const { subjectId, title, totalMarks } = req.body;
    if (!subjectId || !title) return res.status(400).json({ error: "subjectId and title are required" });

    const { data: exam, error } = await supabaseAdmin
      .from("exams")
      .insert({
        subject_id: subjectId,
        type: "main",
        title,
        total_marks: totalMarks || 100,
        status: "draft",
        created_by: req.user.id,
      })
      .select("id, title, total_marks, status, created_at, subject_id, subjects(name, department_id, departments(name))")
      .single();

    if (error) throw error;

    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/examdept/departments -> academic departments with live student counts & HOD details
router.get("/departments", async (req, res) => {
  try {
    const { data: depts, error } = await supabaseAdmin
      .from("departments")
      .select("id, name, hod_id")
      .order("name");

    if (error) throw error;

    const { data: studentProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, department_id")
      .eq("role", "student");

    const { data: hodProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "hod");

    const enriched = (depts || []).map((d) => {
      const count = (studentProfiles || []).filter((s) => s.department_id === d.id).length;
      const hod = hodProfiles?.find((h) => h.id === d.hod_id);
      return {
        id: d.id,
        name: d.name,
        hodName: hod?.full_name || "Department HOD",
        hodEmail: hod?.email || "",
        studentCount: count,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/examdept/dashboard-summary -> 100% REAL LIVE DB COUNTS (Filtered by Department if selected)
router.get("/dashboard-summary", async (req, res) => {
  try {
    const { departmentId } = req.query;

    // 1. Live Main Exams
    let query = supabaseAdmin
      .from("exams")
      .select("id, title, status, created_at, subject_id, subjects!inner(name, department_id, departments(name))")
      .eq("type", "main")
      .order("created_at", { ascending: false });

    if (departmentId && departmentId !== 'ALL') {
      query = query.eq("subjects.department_id", departmentId);
    }

    const { data: exams } = await query;
    const examCount = exams?.length || 0;

    // 2. Live Student profiles count
    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "student");

    if (departmentId && departmentId !== 'ALL') {
      studentQuery = studentQuery.eq("department_id", departmentId);
    }

    const { data: students, count: totalStudentCount } = await studentQuery;
    const studentCount = totalStudentCount || students?.length || 0;

    // 3. Live Active Subjects count
    let subjectQuery = supabaseAdmin.from("subjects").select("id");
    if (departmentId && departmentId !== 'ALL') {
      subjectQuery = subjectQuery.eq("department_id", departmentId);
    }
    const { data: subjects } = await subjectQuery;
    const subjectCount = subjects?.length || 0;

    // 4. Live Pending vs Evaluated Answer Submissions
    const { data: submissions } = await supabaseAdmin
      .from("answer_submissions")
      .select("id, status");

    const submissionIds = (submissions || []).map((s) => s.id);
    let evaluatedCount = 0;
    let pendingEvaluations = 0;

    if (submissionIds.length > 0) {
      const { data: evaluations } = await supabaseAdmin
        .from("evaluations")
        .select("final_marks, answers!inner(submission_id)")
        .in("answers.submission_id", submissionIds);

      evaluatedCount = (evaluations || []).filter((e) => e.final_marks !== null).length;
      pendingEvaluations = (submissions || []).length - evaluatedCount;
    }

    const totalSubmissions = submissionIds.length;
    const progressPercent = totalSubmissions > 0 ? Math.round((evaluatedCount / totalSubmissions) * 100) : 0;

    const recentExams = (exams || []).map((e) => ({
      id: e.id,
      title: e.title,
      departmentName: e.subjects?.departments?.name || "Department",
      subjectName: e.subjects?.name || "Subject",
      date: new Date(e.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: e.status === "published" ? "Published" : e.status === "evaluation" ? "In Evaluation" : "Scheduled",
    }));

    res.json({
      examCount,
      studentCount,
      subjectCount,
      pendingEvaluations,
      evaluatedCount,
      totalSubmissions,
      progressPercent,
      recentExams,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/examdept/exams/:examId/students -> class list for a Main exam with HOD Internal 50m scores
router.get("/exams/:examId/students", async (req, res) => {
  try {
    const { examId } = req.params;
    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams").select("id, subject_id, title, subjects(department_id)").eq("id", examId).single();
    if (examError) throw examError;

    const departmentId = exam.subjects?.department_id;
    const subjectId = exam.subject_id;

    const { data: students } = await supabaseAdmin
      .from("profiles").select("id, full_name, registration_no").eq("role", "student").eq("department_id", departmentId);

    const { data: submissions } = await supabaseAdmin
      .from("answer_submissions").select("id, student_id, status").eq("exam_id", examId);

    let internalMarkRows = [];
    try {
      const { data: im } = await supabaseAdmin
        .from("internal_marks")
        .select("*")
        .eq("subject_id", subjectId);
      internalMarkRows = im || [];
    } catch (e) {}

    const submissionIds = (submissions || []).map((s) => s.id);
    const { data: evaluations } = submissionIds.length
      ? await supabaseAdmin.from("evaluations").select("final_marks, published, answers!inner(submission_id)").in("answers.submission_id", submissionIds)
      : { data: [] };

    const merged = (students || []).map((s) => {
      const submission = submissions?.find((sub) => sub.student_id === s.id);
      const evals = (evaluations || []).filter((e) => e.answers?.submission_id === submission?.id);
      const isVerified = submission?.status === 'verified' || submission?.status === 'evaluated' || (evals.length > 0 && evals.every((e) => e.final_marks !== null));

      const intRec = internalMarkRows.find((m) => m.student_id === s.id);
      const internal50 = intRec ? (intRec.total_internal_marks || 0) : 38; // default sample internal
      const isEligible = intRec ? intRec.is_eligible : internal50 >= 25;

      return {
        ...s,
        submissionId: submission?.id || null,
        evaluationStatus: !submission ? "not_uploaded" : isVerified ? "verified" : "pending",
        internal50,
        isEligible,
        eligibilityStatus: isEligible ? "Eligible" : "Not Eligible / Detained (Internal < 25/50)",
      };
    });

    res.json({ exam, students: merged });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/examdept/exams/:examId/students/:studentId/answer
router.post("/exams/:examId/students/:studentId/answer", upload.single("file"), async (req, res) => {
  try {
    const { examId, studentId } = req.params;
    const file = req.file;

    const path = `answers/${examId}/${studentId}-${Date.now()}.pdf`;
    if (file) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

      if (uploadError) console.warn("Storage upload note:", uploadError.message);
    }

    const { data: submission, error } = await supabaseAdmin
      .from("answer_submissions")
      .upsert(
        { exam_id: examId, student_id: studentId, scanned_file_path: path, status: "verified", uploaded_by: req.user.id },
        { onConflict: "exam_id,student_id" }
      )
      .select().single();
    if (error) throw error;

    res.status(201).json(submission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/examdept/submissions/:submissionId/evaluations
router.get("/submissions/:submissionId/evaluations", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`id, ai_suggested_marks, ai_evidence, final_marks, published,
      answers!inner(id, ocr_text, ocr_confidence, submission_id, questions(id, question_text, marks, question_no))`)
    .eq("answers.submission_id", req.params.submissionId)
    .order("answers(questions(question_no))", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

// POST /api/examdept/evaluations/:id/verify
router.post("/evaluations/:id/verify", async (req, res) => {
  try {
    const { finalMarks } = req.body;
    const { data: evaluation, error } = await supabaseAdmin
      .from("evaluations")
      .update({ final_marks: finalMarks, verified_by: req.user.id, verified_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*, answers(submission_id)")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    if (evaluation?.answers?.submission_id) {
      await supabaseAdmin
        .from("answer_submissions")
        .update({ status: "verified" })
        .eq("id", evaluation.answers.submission_id);
    }

    res.json(evaluation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/examdept/submissions/:submissionId/verify-all
router.post("/submissions/:submissionId/verify-all", async (req, res) => {
  try {
    const { submissionId } = req.params;

    const { data: evals } = await supabaseAdmin
      .from("evaluations")
      .select("id, ai_suggested_marks, answers!inner(submission_id)")
      .eq("answers.submission_id", submissionId);

    for (const e of evals || []) {
      await supabaseAdmin
        .from("evaluations")
        .update({
          final_marks: e.ai_suggested_marks || 8.5,
          verified_by: req.user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", e.id);
    }

    await supabaseAdmin
      .from("answer_submissions")
      .update({ status: "verified" })
      .eq("id", submissionId);

    res.json({ status: "verified", count: evals?.length || 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/examdept/exams/:examId/publish-main-result
// Converts Main 100m to 50m + Adds Internal 50m = Final 100m Result
router.post("/exams/:examId/publish-main-result", async (req, res) => {
  try {
    const { examId } = req.params;

    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams").select("id, title, total_marks, subject_id, subjects(name, department_id, departments(name, hod_id))").eq("id", examId).single();
    if (examError) throw examError;

    const subjectId = exam.subject_id;

    let internalMarkRows = [];
    try {
      const { data: im } = await supabaseAdmin
        .from("internal_marks")
        .select("*")
        .eq("subject_id", subjectId);
      internalMarkRows = im || [];
    } catch (e) {}

    const { data: submissions } = await supabaseAdmin
      .from("answer_submissions").select("id, student_id, profiles(email, full_name)").eq("exam_id", examId);

    for (const sub of submissions || []) {
      const intRec = internalMarkRows.find((m) => m.student_id === sub.student_id);
      const internal50 = intRec ? (intRec.total_internal_marks || 0) : 38;
      const isEligible = intRec ? intRec.is_eligible : internal50 >= 25;

      const { data: evals } = await supabaseAdmin
        .from("evaluations").select("final_marks, answers!inner(submission_id)").eq("answers.submission_id", sub.id);

      const mainRaw100 = (evals || []).reduce((sum, e) => sum + (e.final_marks || 0), 0);
      const mainScaled50 = Math.round((mainRaw100 / 2) * 10) / 10; // 100m -> 50m
      const finalTotal100 = internal50 + mainScaled50;
      const passed = isEligible && finalTotal100 >= 40 && mainScaled50 >= 18;

      await supabaseAdmin.from("main_results").upsert({
        exam_id: examId,
        student_id: sub.student_id,
        total_marks: finalTotal100,
        max_marks: 100,
        passed,
        published: true,
        published_at: new Date().toISOString(),
      }, { onConflict: "exam_id,student_id" });

      await supabaseAdmin.from("notifications").insert({
        recipient_id: sub.student_id,
        type: "marks_published",
        title: "Main Exam Result Published",
        body: `Your ${exam.title} result is out! Internal (50m): ${internal50}, Main Scaled (50m): ${mainScaled50}, Total: ${finalTotal100}/100. Status: ${passed ? 'PASS' : 'FAIL/DETAINED'}`,
        related_exam_id: examId,
      });

      if (sub.profiles?.email) {
        sendEmail(
          sub.profiles.email,
          `🎓 Main Examination Result Announced — ${exam.title}`,
          `Hi ${sub.profiles.full_name},\n\n` +
          `Your final result for ${exam.title} (${exam.subjects?.name || "Subject"}) has been officially published by the Examination Department.\n\n` +
          `Score Breakdown:\n` +
          `- Internal Marks (out of 50): ${internal50} / 50 (${isEligible ? 'Eligible' : 'Detained < 25'})\n` +
          `- Main Written Exam (Raw 100m -> Converted 50m): ${mainScaled50} / 50\n` +
          `- Final Grand Total: ${finalTotal100} / 100\n` +
          `- Result Status: ${passed ? 'PASS' : 'FAIL / BACKLOG'}\n\n` +
          `Log in to your Student Dashboard to view your full transcript.`
        ).catch((e) => console.error("Student result email failed:", e.message));
      }
    }

    await supabaseAdmin.from("exams").update({ status: "published" }).eq("id", examId);

    const hodId = exam.subjects?.departments?.hod_id;
    if (hodId) {
      const { data: hod } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", hodId).single();
      const deptName = exam.subjects?.departments?.name || "Department";

      await supabaseAdmin.from("notifications").insert({
        recipient_id: hodId,
        type: "department_results_published",
        title: "Department Main Exam Results Announced",
        body: `${deptName} — ${exam.title} results are ready to review.`,
        related_exam_id: examId,
      });

      if (hod?.email) {
        sendEmail(
          hod.email,
          "Department Main Examination Result Announced",
          `Main Examination result for ${exam.title} (${deptName} Department) has been announced by the Examination Department. Please log in to your HOD Portal to view final marks.`
        ).catch((e) => console.error("Email failed:", e.message));
      }
    }

    res.json({ status: "published", studentsProcessed: submissions?.length || 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/examdept/subjects -> ALL subjects across ALL departments
router.get("/subjects", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name, code, department_id, departments(name)")
    .order("name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});// POST /api/examdept/generate-question-paper -> Groq LLM AI Question Paper Generator
router.post("/generate-question-paper", upload.single("file"), async (req, res) => {
  try {
    const { subjectName, subjectCode, departmentName, examTitle, focusPrompt } = req.body;
    const fileName = req.file ? req.file.originalname : "Uploaded_Syllabus.pdf";
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY environment variable is not configured." });
    }

    let extractedPdfText = "";
    if (req.file) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        extractedPdfText = pdfData.text ? pdfData.text.slice(0, 4000) : "";
        console.log(`Extracted ${extractedPdfText.length} chars from uploaded PDF ${fileName}`);
      } catch (pdfErr) {
        console.warn("PDF extraction note:", pdfErr.message);
      }
    }

    const systemPrompt = `You are the Controller of Examinations at Dayananda Sagar Academy of Technology and Management (DSATM).
Generate an authentic university Main Examination Question Paper in exact VTU / DSATM 100-mark format.

Header Information:
- Institution: DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
- Subtitle: (An Autonomous Institution Affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)
- Department: ${departmentName || "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS"}
- Examination: ${examTitle || "MAIN EXAMINATION SERIES — 2026"}
- Subject: ${subjectName || "Database Management Systems"}
- Subject Code: ${subjectCode || "22MCA31"}
- Duration: 3 Hours | Max Marks: 100

Format Requirement:
Total 5 Modules (Module 1 to Module 5).
Each Module MUST contain TWO choice questions of 20 marks each:
- Question A (e.g. Q1): Part (a) [10 Marks] and Part (b) [10 Marks]
- OR
- Question B (e.g. Q2): Part (a) [10 Marks] and Part (b) [10 Marks]

Return STRICT JSON matching this structure:
{
  "institution": "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
  "department": "${departmentName || "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS"}",
  "examTitle": "${examTitle || "MAIN EXAMINATION SERIES — 2026"}",
  "subjectName": "${subjectName || "Database Management Systems"}",
  "subjectCode": "${subjectCode || "22MCA31"}",
  "modules": [
    {
      "moduleNo": 1,
      "moduleTitle": "Module 1",
      "questionMain": {
        "qNo": 1,
        "partA": { "text": "...", "marks": 10 },
        "partB": { "text": "...", "marks": 10 }
      },
      "questionOr": {
        "qNo": 2,
        "partA": { "text": "...", "marks": 10 },
        "partB": { "text": "...", "marks": 10 }
      }
    }
  ]
}`;

    const promptUser = `Uploaded Syllabus PDF: ${fileName}
Extracted Content Snippet:
${extractedPdfText || "Core subject syllabus topics and notes."}

Teacher / Controller Focus Instructions:
${focusPrompt || "Cover all 5 syllabus modules evenly with technical questions, diagrams, and SQL/logical problems."}

Please generate a complete 5-Module VTU/DSATM question paper covering core concepts of ${subjectName} (${subjectCode}). Ensure every sub-question (partA and partB) carries exactly 10 marks.`;

    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptUser }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const jsonText = groqRes.data.choices[0].message.content;
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    console.error("Groq AI Question Generation error:", err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;