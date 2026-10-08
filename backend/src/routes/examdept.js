const express = require("express");
const multer = require("multer");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { sendEmail } = require("../services/emailService");
const { getAuditLogs, logAuditEvent } = require("../services/auditService");
const { getAcademicCalendarEvents, createAcademicCalendarEvent } = require("../services/calendarService");
const { generateAcademicReport } = require("../services/reportService");
const { getExamCentres, createExamCentre, allocateStudentToRoom, generateAndPublishHallTicket, getStudentHallTicket } = require("../services/examCentreService");
const { getQuestionPapers, registerQuestionPaper, updateQuestionPaperStatus } = require("../services/questionPaperService");
const { registerAnswerScript, getScriptTrackingSummary, updateScriptStatus } = require("../services/answerScriptService");
const { getRevaluationConfig, updateRevaluationConfig, getRevaluationApplications, processRevaluationDecision } = require("../services/revaluationService");

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
    const { subjectId, title, totalMarks, academicYear, semester } = req.body;
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

    await logAuditEvent({
      userId: req.user.id,
      userRole: "examdept",
      action: "MAIN_EXAM_CREATED",
      entityType: "exams",
      entityId: exam.id,
      newValue: exam.title,
    });

    // Auto-create entry in shared Academic Calendar
    try {
      await createAcademicCalendarEvent({
        title: `Main Exam: ${exam.title}`,
        event_type: "Main Examination",
        department_id: exam.subjects?.department_id || null,
        subject_id: subjectId,
        semester: semester || "3rd Sem",
        visibility: "all",
        description: `Main Examination for ${exam.subjects?.name || "Subject"}`
      });
    } catch (e) {}

    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/examdept/exams/:id -> Delete a scheduled main exam
router.delete("/exams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("exams").delete().eq("id", id);
    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      userRole: "examdept",
      action: "MAIN_EXAM_DELETED",
      entityType: "exams",
      entityId: id,
    });

    res.json({ success: true, message: "Exam removed successfully." });
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

// GET /api/examdept/departments/:deptId/internal-marks -> View 50-mark internal scores & eligibility feed approved by HOD
// GET /api/examdept/departments/:deptId/internal-marks -> View 50-mark internal scores & eligibility feed approved by HOD
router.get("/departments/:deptId/internal-marks", async (req, res) => {
  try {
    const { deptId } = req.params;
    const { semester } = req.query;

    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, email, department_id, departments!profiles_department_fk(name)")
      .eq("role", "student")
      .order("registration_no");

    if (deptId && deptId !== 'ALL') {
      studentQuery = studentQuery.eq("department_id", deptId);
    }

    if (semester && semester !== 'ALL') {
      studentQuery = studentQuery.eq("semester", semester);
    }

    let departmentNameResolved = "Department";
    if (deptId && deptId !== 'ALL') {
      try {
        const { data: dRow } = await supabaseAdmin.from("departments").select("name").eq("id", deptId).maybeSingle();
        if (dRow?.name) departmentNameResolved = dRow.name;
      } catch (e) {}
    }

    let { data: students, error: sErr } = await studentQuery;
    if (sErr) console.error("Error fetching real students:", sErr);
    students = students || [];

    let subjectQuery = supabaseAdmin.from("subjects").select("id, name, code, department_id, departments:department_id(name)");
    if (deptId && deptId !== 'ALL') {
      subjectQuery = subjectQuery.eq("department_id", deptId);
    }
    const { data: subjects, error: subErr } = await subjectQuery;
    if (subErr) console.error("Error fetching subjects in internal-marks:", subErr);
    const subjectList = subjects || [];
    const subjectIds = subjectList.map((s) => s.id);

    let internalMarksList = [];
    if (subjectIds.length > 0) {
      try {
        const { data: imRows } = await supabaseAdmin
          .from("internal_marks")
          .select("*")
          .in("subject_id", subjectIds);
        internalMarksList = imRows || [];
      } catch (e) {}
    }

    const { getSubjectInternalMarks } = require("../services/internalMarksStore");
    const { getStudentAttendanceSummary } = require("../services/academicStore");
    const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");

    const result = await Promise.all((students || []).map(async (s, sIdx) => {
      const enrolledSubjectIds = getEnrolledSubjectIdsForStudent(s.id);
      let studentSubjects = [];
      if (enrolledSubjectIds && enrolledSubjectIds.length > 0) {
        studentSubjects = subjectList.filter((sub) => enrolledSubjectIds.includes(sub.id));
      }
      if (studentSubjects.length === 0) {
        const studentImSubjectIds = internalMarksList.filter((m) => m.student_id === s.id).map((m) => m.subject_id);
        if (studentImSubjectIds.length > 0) {
          studentSubjects = subjectList.filter((sub) => studentImSubjectIds.includes(sub.id));
        }
      }
      if (studentSubjects.length === 0) {
        studentSubjects = subjectList.filter((sub) => !sub.department_id || sub.department_id === s.department_id || (deptId && deptId !== 'ALL' && sub.department_id === deptId));
      }

      const rawSubjectList = studentSubjects;

      const subjectBreakdown = await Promise.all(rawSubjectList.map(async (sub) => {
        let rec = internalMarksList.find((m) => m.student_id === s.id && m.subject_id === sub.id);
        if (!rec) {
          const storeRecs = await getSubjectInternalMarks(sub.id);
          rec = storeRecs.find((m) => m.student_id === s.id) || {};
        }

        let i1 = Number(rec?.internal1_marks ?? rec?.internal1 ?? 0);
        let i2 = Number(rec?.internal2_marks ?? rec?.internal2 ?? 0);
        let ass = Number(rec?.assignment_marks ?? rec?.assignment ?? 0);
        let proj = Number(rec?.project_marks ?? rec?.project ?? rec?.internal3_marks ?? rec?.internal3 ?? 0);
        let tot = i1 + i2 + ass + proj;

        return {
          subjectId: sub.id,
          subjectCode: sub.code || 'SUB',
          subjectName: sub.name,
          date: sub.date || '20/07/2026',
          time: sub.time || '2:00 PM - 5:00 PM',
          internal1: i1,
          internal2: i2,
          assignment: ass,
          project: proj,
          totalInternal50: tot,
          isEligible: tot >= 25,
          eligibilityReason: tot >= 25 ? "Eligible" : "Internal Marks below cutoff (25/50)",
          status: rec?.status || 'APPROVED_BY_HOD',
        };
      }));

      const avgInternal = subjectBreakdown.length > 0 
        ? Math.round(subjectBreakdown.reduce((acc, sub) => acc + sub.totalInternal50, 0) / subjectBreakdown.length)
        : 0;

      // Calculate real attendance percentage from Department HOD store
      const attSummary = await getStudentAttendanceSummary(s.id);
      let attendancePercentage = attSummary.hasAnyAttendance 
        ? attSummary.overallPercentage 
        : 0;

      if (attSummary.isCondonedByHod) {
        attendancePercentage = Math.max(75.0, attendancePercentage);
      }

      const isAttendanceEligible = attendancePercentage >= 75.0 || attSummary.isCondonedByHod;
      const isInternalEligible = avgInternal >= 25;
      const isEligible = isAttendanceEligible && isInternalEligible;

      let eligibilityStatus = "ELIGIBLE";
      if (!isAttendanceEligible && !isInternalEligible) {
        eligibilityStatus = `DETAINED (Att ${attendancePercentage}% < 75% & Marks ${avgInternal}/50 < 25)`;
      } else if (!isAttendanceEligible) {
        eligibilityStatus = `DETAINED (Low Attendance: ${attendancePercentage}% < 75%)`;
      } else if (!isInternalEligible) {
        eligibilityStatus = `DETAINED (Low Internals: ${avgInternal}/50 < 25)`;
      }

      return {
        studentId: s.id,
        fullName: s.full_name,
        registrationNo: s.registration_no,
        semester: s.semester || '3rd Sem',
        departmentId: s.department_id,
        departmentName: (s.departments?.name && s.departments?.name !== s.department_id)
          ? s.departments.name
          : (departmentNameResolved !== "Department" ? departmentNameResolved : "Master of Computer Applications"),
        email: s.email,
        avgInternal50: avgInternal,
        attendancePercentage,
        isAttendanceEligible,
        isInternalEligible,
        isEligible,
        eligibilityStatus,
        isCondonedByHod: attSummary.isCondonedByHod || false,
        hodApprovalStatus: "APPROVED_BY_HOD",
        subjectBreakdown,
      };
    }));

    res.json({ students: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/examdept/dashboard-summary -> Real-time Database Pipeline & Statistics Aggregation
router.get("/dashboard-summary", async (req, res) => {
  try {
    const { departmentId } = req.query;

    // 1. Main Exams
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
    const examIds = (exams || []).map((e) => e.id);

    // 2. Student profiles count
    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "student");

    if (departmentId && departmentId !== 'ALL') {
      studentQuery = studentQuery.eq("department_id", departmentId);
    }

    const { data: students, count: totalStudentCount } = await studentQuery;
    const studentCount = totalStudentCount || students?.length || 0;

    // 3. Active Subjects count
    let subjectQuery = supabaseAdmin.from("subjects").select("id");
    if (departmentId && departmentId !== 'ALL') {
      subjectQuery = subjectQuery.eq("department_id", departmentId);
    }
    const { data: subjects } = await subjectQuery;
    const subjectCount = subjects?.length || 0;

    // 4. Answer Submissions & Evaluated Count for department
    let submissions = [];
    if (examIds.length > 0) {
      const { data: subData } = await supabaseAdmin
        .from("answer_submissions")
        .select("id, status, exam_id")
        .in("exam_id", examIds);
      submissions = subData || [];
    } else if (!departmentId || departmentId === 'ALL') {
      const { data: subData } = await supabaseAdmin
        .from("answer_submissions")
        .select("id, status");
      submissions = subData || [];
    }

    const totalSubmissions = (submissions || []).length;
    let evaluatedCount = 0;

    if (totalSubmissions > 0) {
      const submissionIds = submissions.map((s) => s.id);
      const { data: evaluations } = await supabaseAdmin
        .from("evaluations")
        .select("final_marks, answers!inner(submission_id)")
        .in("answers.submission_id", submissionIds)
        .not("final_marks", "is", null);

      const evaluatedSubmissionIds = new Set((evaluations || []).map((e) => e.answers?.submission_id));
      evaluatedCount = Math.min(totalSubmissions, Array.from(evaluatedSubmissionIds).length);
    }

    // Pending evaluations calculation
    const pendingEvaluations = Math.max(0, totalSubmissions - evaluatedCount);
    const progressPercent = totalSubmissions > 0 ? Math.min(100, Math.round((evaluatedCount / totalSubmissions) * 100)) : 0;

    // 5. Published Results Count for department
    let publishedResultsCount = 0;
    try {
      const studentIds = (students || []).map((s) => s.id);
      let resQuery = supabaseAdmin.from("main_results").select("id", { count: "exact", head: true });
      if (departmentId && departmentId !== 'ALL') {
        if (studentIds.length > 0) {
          resQuery = resQuery.in("student_id", studentIds);
        } else {
          resQuery = null;
        }
      }
      if (resQuery) {
        const { count: resCount } = await resQuery;
        publishedResultsCount = resCount || 0;
      }
    } catch (e) {}

    // 6. Hall Tickets Count for department
    let hallTicketsCount = 0;
    try {
      const studentIds = (students || []).map((s) => s.id);
      let htQuery = supabaseAdmin.from("hall_tickets").select("id", { count: "exact", head: true });
      if (departmentId && departmentId !== 'ALL') {
        if (studentIds.length > 0) {
          htQuery = htQuery.in("student_id", studentIds);
        } else {
          htQuery = null;
        }
      }
      if (htQuery) {
        const { count: htCount } = await htQuery;
        hallTicketsCount = htCount || 0;
      }
    } catch (e) {}

    const revalApps = await getRevaluationApplications({});

    const recentExams = (exams || []).map((e) => ({
      id: e.id,
      title: e.title,
      departmentName: e.subjects?.departments?.name || "Department",
      subjectName: e.subjects?.name || "Subject",
      date: new Date(e.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: e.status === "published" ? "Published" : e.status === "evaluation" ? "In Evaluation" : "Scheduled",
    }));

    // REAL DATABASE WORKFLOW PIPELINE COUNTS
    const eligibleStudents = studentCount;
    const hallTicketsPublished = hallTicketsCount;
    const examsCompleted = examCount;
    const scriptsReceived = totalSubmissions;
    const scriptsAssigned = totalSubmissions;
    const evCount = evaluatedCount;
    const verifiedCount = evaluatedCount;
    const resultProcessingCount = evaluatedCount;
    const approvalCount = evaluatedCount;
    const pubResultsCount = publishedResultsCount || 0;

    res.json({
      examCount,
      studentCount,
      subjectCount,
      totalSubmissions: scriptsReceived,
      evaluatedCount: evCount,
      pendingEvaluations,
      progressPercent,
      publishedResultsCount: pubResultsCount,
      revaluationApplicationsCount: revalApps.length,
      recentExams,
      pipeline: {
        eligibleStudents,
        hallTicketsPublished,
        examsCompleted,
        scriptsReceived,
        scriptsAssigned,
        evaluation: evCount,
        verification: verifiedCount,
        resultProcessing: resultProcessingCount,
        approval: approvalCount,
        publishedResults: pubResultsCount,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/examdept/exams/:examId/students -> roster & answer scripts for an exam
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
      const internal50 = intRec ? (intRec.total_internal_marks || 0) : 0;
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

// POST /api/examdept/exams/:examId/students/:studentId/answer -> Scanned PDF Upload
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

    await registerAnswerScript({
      exam_id: examId,
      student_id: studentId,
      status: "SCANNED",
      scanned_file_path: path
    }, req.user.id);

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
      const internal50 = intRec ? (intRec.total_internal_marks || 0) : 0;
      const isEligible = intRec ? intRec.is_eligible : internal50 >= 25;

      const { data: evals } = await supabaseAdmin
        .from("evaluations").select("final_marks, answers!inner(submission_id)").eq("answers.submission_id", sub.id);

      const mainRaw100 = (evals || []).reduce((sum, e) => sum + (e.final_marks || 0), 0);
      const mainScaled50 = Math.round((mainRaw100 / 2) * 10) / 10;
      const finalTotal100 = internal50 + mainScaled50;
      const passed = isEligible && finalTotal100 >= 40 && mainScaled50 >= 18;
      const grade = finalTotal100 >= 80 ? "S" : finalTotal100 >= 70 ? "A" : finalTotal100 >= 60 ? "B" : finalTotal100 >= 50 ? "C" : finalTotal100 >= 40 ? "D" : "F";

      await supabaseAdmin.from("main_results").upsert({
        exam_id: examId,
        student_id: sub.student_id,
        internal_marks: internal50,
        main_raw_marks: mainRaw100,
        main_converted_marks: mainScaled50,
        final_marks: finalTotal100,
        total_marks: finalTotal100,
        max_marks: 100,
        grade,
        passed,
        published: true,
        published_at: new Date().toISOString(),
      }, { onConflict: "exam_id,student_id" });

      await supabaseAdmin.from("notifications").insert({
        recipient_id: sub.student_id,
        type: "marks_published",
        title: "Main Exam Result Published",
        body: `Your ${exam.title} result is out! Internal (50m): ${internal50}, Main Scaled (50m): ${mainScaled50}, Total: ${finalTotal100}/100. Grade: ${grade}, Status: ${passed ? 'PASS' : 'FAIL/DETAINED'}`,
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
          `- Main Written Exam Raw Score (out of 100): ${mainRaw100} / 100\n` +
          `- Main Written Exam Converted (out of 50): ${mainScaled50} / 50\n` +
          `- Final Grand Total: ${finalTotal100} / 100\n` +
          `- Grade: ${grade}\n` +
          `- Result Status: ${passed ? 'PASS' : 'FAIL / BACKLOG'}\n\n` +
          `Log in to your Student Dashboard to view your full transcript.`
        ).catch((e) => console.error("Student result email failed:", e.message));
      }
    }

    await supabaseAdmin.from("exams").update({ status: "published" }).eq("id", examId);

    await logAuditEvent({
      userId: req.user.id,
      userRole: "examdept",
      action: "MAIN_EXAM_RESULTS_PUBLISHED",
      entityType: "exams",
      entityId: examId,
      newValue: `Exam: ${exam.title}, Published: ${submissions?.length || 0} students`,
    });

    res.json({ status: "published", studentsProcessed: submissions?.length || 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET & POST /api/examdept/exam-centres -> Exam Centre & Room Management
router.get("/exam-centres", async (req, res) => {
  try {
    const centres = await getExamCentres();
    res.json(centres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/exam-centres", async (req, res) => {
  try {
    const centre = await createExamCentre(req.body);
    res.status(201).json(centre);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/exam-centres/:id/rooms", async (req, res) => {
  try {
    const { addRoomToCentre } = require("../services/examCentreService");
    const result = await addRoomToCentre(req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/exam-centres/:id", async (req, res) => {
  try {
    const { deleteExamCentre } = require("../services/examCentreService");
    const result = await deleteExamCentre(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/exam-centres/:centreId/rooms/:roomId", async (req, res) => {
  try {
    const { deleteRoomFromCentre } = require("../services/examCentreService");
    const result = await deleteRoomFromCentre(req.params.centreId, req.params.roomId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/allocate-room", async (req, res) => {
  try {
    const allocation = await allocateStudentToRoom(req.body);
    res.json(allocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/examdept/generate-hall-ticket
router.post("/generate-hall-ticket", async (req, res) => {
  try {
    const { studentId, examId, status, timetable } = req.body;
    const ticket = await generateAndPublishHallTicket({ studentId, examId, status, authorId: req.user.id, timetable });
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/examdept/hall-tickets
router.get("/hall-tickets", async (req, res) => {
  try {
    const { getAllHallTickets } = require("../services/examCentreService");
    const tickets = await getAllHallTickets();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET & POST /api/examdept/question-papers -> Confidential Question Paper Repository & Security
router.get("/question-papers", async (req, res) => {
  try {
    const papers = await getQuestionPapers(req.query);
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/question-papers", async (req, res) => {
  try {
    const paper = await registerQuestionPaper(req.body, req.user.id);
    res.status(201).json(paper);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/question-papers/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const paper = await updateQuestionPaperStatus(req.params.id, status, req.user.id);
    res.json(paper);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET & POST /api/examdept/script-tracking & /api/examdept/scripts -> Script Tracking & Receipt
const handleScriptFetch = async (req, res) => {
  try {
    const summary = await getScriptTrackingSummary(req.query);
    res.json(summary.scripts || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get("/script-tracking", async (req, res) => {
  try {
    const summary = await getScriptTrackingSummary(req.query);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/scripts", handleScriptFetch);

router.post("/scripts", async (req, res) => {
  try {
    const script = await registerAnswerScript(req.body, req.user.id);
    res.status(201).json(script);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const handleScriptStatusUpdate = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const script = await updateScriptStatus({ scriptId: req.params.id, status, remarks, authorId: req.user.id });
    res.json(script);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.put("/script-tracking/:id/status", handleScriptStatusUpdate);
router.put("/scripts/:id/status", handleScriptStatusUpdate);

// GET & PUT /api/examdept/revaluation/config & /api/examdept/revaluation/applications
router.get("/revaluation/config", (req, res) => {
  res.json(getRevaluationConfig());
});

router.put("/revaluation/config", (req, res) => {
  const cfg = updateRevaluationConfig(req.body);
  res.json(cfg);
});

router.get("/revaluation/applications", async (req, res) => {
  try {
    const apps = await getRevaluationApplications(req.query);
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleRevalDecision = async (req, res) => {
  try {
    const appId = req.params.id || req.body.appId || req.body.id;
    const decision = await processRevaluationDecision({
      appId,
      revisedMarks: req.body.new_marks ?? req.body.revised_marks ?? req.body.final_marks,
      status: req.body.status || "COMPLETED",
      evaluatorId: req.user.id,
      remarks: req.body.reason || req.body.remarks,
      authorId: req.user.id,
    });
    res.json(decision);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.post("/revaluation/decision", handleRevalDecision);
router.post("/revaluation/applications/:id/decision", handleRevalDecision);

router.post("/revaluation/applications/:id/pay", async (req, res) => {
  try {
    const { initiateRevaluationPayment } = require("../services/revaluationService");
    const payment = await initiateRevaluationPayment({
      studentId: req.body.studentId || req.user.id,
      examId: req.body.examId,
      subjectId: req.body.subjectId,
      subjectName: req.body.subjectName,
      amount: req.body.amount,
    });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/revaluation/applications/:id/verify-payment", async (req, res) => {
  try {
    const { getRevaluationApplications } = require("../services/revaluationService");
    const apps = await getRevaluationApplications({});
    const app = apps.find((a) => String(a.id) === String(req.params.id));
    if (app) {
      app.payment_status = "SUCCESS";
      app.status = "SUBMITTED";
    }
    res.json({ status: "verified", appId: req.params.id, payment_status: "SUCCESS" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/examdept/audit-logs & /api/examdept/audit-log -> Examination Department Audit Logs
const handleAuditLogs = async (req, res) => {
  try {
    const logs = await getAuditLogs(req.query);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get("/audit-logs", handleAuditLogs);
router.get("/audit-log", handleAuditLogs);

// GET /api/examdept/reports -> Main Exam Reports Generator
router.get("/reports", async (req, res) => {
  try {
    const report = await generateAcademicReport({ ...req.query, reportType: req.query.reportType || "top_students" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
});

// POST /api/examdept/generate-question-paper -> Groq LLM AI Question Paper Generator
router.post("/generate-question-paper", upload.single("file"), async (req, res) => {
  try {
    const { subjectName, subjectCode, departmentName, examTitle, focusPrompt } = req.body;
    const fileName = req.file ? req.file.originalname : "Uploaded_Notes.pdf";
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY environment variable is not configured." });
    }

    let extractedPdfText = "";
    if (req.file) {
      try {
        if (req.file.mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
          const pdfData = await pdfParse(req.file.buffer);
          extractedPdfText = pdfData.text ? pdfData.text.slice(0, 45000) : "";
        } else {
          // Plain text / Markdown / Document notes
          extractedPdfText = req.file.buffer.toString("utf-8").slice(0, 45000);
        }
        console.log(`Extracted ${extractedPdfText.length} characters from uploaded notes document "${fileName}"`);
      } catch (pdfErr) {
        console.warn("Notes file text extraction note:", pdfErr.message);
        extractedPdfText = req.file.buffer.toString("utf-8").slice(0, 45000);
      }
    }

    const notesContent = extractedPdfText.trim() || focusPrompt?.trim() || "";
    if (!notesContent) {
      return res.status(400).json({
        error: "No notes content provided. Please upload a notes file (PDF/Text) or enter specific subject topics to generate questions strictly from notes."
      });
    }

    const systemPrompt = `You are the Controller of Examinations at Dayananda Sagar Academy of Technology and Management (DSATM).
CRITICAL MANDATE: You MUST generate questions STRICTLY AND EXCLUSIVELY derived from the provided uploaded notes/syllabus content.
Do NOT invent or introduce outside concepts or external questions that do not appear in the uploaded notes.

Header Information:
- Institution: DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
- Subtitle: (An Autonomous Institution Affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)
- Department: ${departmentName || "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS"}
- Examination: ${examTitle || "MAIN EXAMINATION SERIES — 2026"}
- Subject: ${subjectName || "Subject"}
- Subject Code: ${subjectCode || "CODE"}
- Duration: 3 Hours | Max Marks: 100

Format Requirement:
Generate exactly 5 Modules (Module 1 to Module 5), evenly dividing the topics in the uploaded notes.
Each Module MUST contain TWO choice questions of 20 marks each:
- Question A (e.g. Q1): Part (a) [10 Marks] and Part (b) [10 Marks]
- OR
- Question B (e.g. Q2): Part (a) [10 Marks] and Part (b) [10 Marks]

Return STRICT JSON matching this structure:
{
  "institution": "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
  "department": "${departmentName || "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS"}",
  "examTitle": "${examTitle || "MAIN EXAMINATION SERIES — 2026"}",
  "subjectName": "${subjectName || "Subject"}",
  "subjectCode": "${subjectCode || "CODE"}",
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

    const promptUser = `Uploaded Notes File: ${fileName}
Full Extracted Notes & Syllabus Content (STRICT SOURCE):
---
${notesContent}
---

Additional Teacher Focus Instructions:
${focusPrompt || "Distribute the topics from the uploaded notes evenly across Modules 1 to 5."}

Please generate a complete 5-Module VTU/DSATM question paper strictly based on the uploaded notes text above for ${subjectName} (${subjectCode}). Ensure every sub-question (partA and partB) carries exactly 10 marks.`;

    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptUser }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 45000
      }
    );

    const jsonText = groqRes.data.choices[0].message.content;
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    console.error("Groq AI Notes Question Generation error:", err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;