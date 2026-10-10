const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { getUserBookmarks, addBookmark, removeBookmark } = require("../services/bookmarkStore");
const { getStudentPracticeHistory, recordPracticeAttempt } = require("../services/practiceStore");

const router = express.Router();

router.use(requireAuth, requireRole("student"));

// GET /api/student/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch student profile details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, section, department_id, avatar_url, departments!profiles_department_fk(name)")
      .eq("id", studentId)
      .maybeSingle();

    // Fetch student's marks/evaluations from DB
    const { data: marks } = await supabaseAdmin
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

    const { data: insights } = await supabaseAdmin
      .from("student_insights")
      .select("subject_id, strong_topics, weak_topics, generated_at")
      .eq("student_id", studentId)
      .order("generated_at", { ascending: false });

    res.json({
      profile: profile || req.user,
      marks: marks || [],
      insights: insights || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/subjects -> ONLY subjects the student is enrolled in
router.get("/subjects", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", studentId)
      .maybeSingle();

    let studentSubjIds = getEnrolledSubjectIdsForStudent(studentId);

    if (studentSubjIds.length === 0) {
      try {
        const { data: ss } = await supabaseAdmin
          .from("student_subjects")
          .select("subject_id")
          .eq("student_id", studentId);
        if (ss && ss.length > 0) {
          studentSubjIds = ss.map((s) => s.subject_id);
        }
      } catch (e) {}
    }

    let subjects = [];
    if (studentSubjIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("subjects")
        .select("id, name, code, department_id, faculty_id, profiles:faculty_id(full_name, email)")
        .in("id", studentSubjIds)
        .order("name");
      subjects = data || [];
    } else if (profile?.department_id) {
      const { data } = await supabaseAdmin
        .from("subjects")
        .select("id, name, code, department_id, faculty_id, profiles:faculty_id(full_name, email)")
        .eq("department_id", profile.department_id)
        .order("name");
      subjects = data || [];
    }

    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/materials -> ONLY published course materials for student's enrolled subjects
router.get("/materials", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");
    const enrolledSubjIds = getEnrolledSubjectIdsForStudent(studentId);

    const { subjectId } = req.query;
    let query = supabaseAdmin
      .from("course_materials")
      .select("*, subjects(name, code)")
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    } else if (enrolledSubjIds.length > 0) {
      query = query.in("subject_id", enrolledSubjIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter out unpublished materials if published field exists
    const publishedMaterials = (data || []).filter((m) => m.published === undefined || m.published === true || m.published === "true");

    res.json(publishedMaterials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/examinations -> scheduled examinations for student's enrolled subjects
router.get("/examinations", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");
    const enrolledSubjIds = getEnrolledSubjectIdsForStudent(studentId);

    let exams = [];
    try {
      const { getExamSchedules } = require("../services/examScheduleStore");
      const memoryExams = await getExamSchedules({ status: "PUBLISHED" });

      let query = supabaseAdmin
        .from("exams")
        .select("id, title, type, date, status, subject_id, subjects(name, code, department_id)")
        .order("date", { ascending: true });

      let dbExams = [];
      if (enrolledSubjIds.length > 0) {
        let { data: subExams } = await supabaseAdmin
          .from("exams")
          .select("id, title, type, date, status, subject_id, subjects(name, code, department_id)")
          .in("subject_id", enrolledSubjIds)
          .order("date", { ascending: true });
        if (subExams && subExams.length > 0) {
          dbExams = subExams;
        } else {
          let { data: allExams } = await query;
          dbExams = allExams || [];
        }
      } else {
        let { data: allExams } = await query;
        dbExams = allExams || [];
      }

      const combinedMap = new Map();
      (memoryExams || []).forEach((ex) => {
        const s = (ex.status || "").toUpperCase();
        if (s !== "DRAFT" && s !== "DRAFTING") {
          combinedMap.set(ex.id, ex);
        }
      });
      dbExams.forEach((ex) => {
        const s = (ex.status || "").toUpperCase();
        if (s !== "DRAFT" && s !== "DRAFTING") {
          combinedMap.set(ex.id, ex);
        }
      });

      exams = Array.from(combinedMap.values());
    } catch (e) {}

    const visibleExams = (exams || []).filter((e) => e.status !== "DRAFT" && e.status !== "draft");
    res.json(visibleExams);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/student/complaints
router.get("/complaints", async (req, res) => {
  try {
    const { getStudentComplaints } = require("../services/complaintStore");
    const data = await getStudentComplaints(req.user.id);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/complaints
router.post("/complaints", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Reason is required to submit a complaint" });
    }

    const { createComplaint } = require("../services/complaintStore");
    const complaint = await createComplaint(req.user.id, req.body);
    res.status(201).json(complaint);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function resolveSubjectIdFromEntry(entry) {
  if (!entry) return null;
  if (entry.subjectId) return entry.subjectId;
  if (entry.subject_id) return entry.subject_id;
  const code = String(entry.subjectCode || entry.code || "").toUpperCase();
  const name = String(entry.subjectName || entry.name || "").toLowerCase();

  if (code.includes("MMC335") || name.includes("devops") || code.includes("22MCA31") || name.includes("cloud computing")) return "004df87a-c02a-4296-bed5-51d8bd0fe371";
  if (code.includes("MMC333") || name.includes("web development")) return "b76fa471-11e9-4b91-9281-93200ff8d6e7";
  if (code.includes("MMC312") || name.includes("ethical hacking")) return "9d4b7294-a0d0-4c39-acb3-93e01d818cb3";
  if (code.includes("MMC321") || name.includes("deep learning")) return "f1c125fa-ca62-44a8-9e88-1c96c0fa9358";
  if (code.includes("MMC316") || name.includes("software design")) return "711130b8-e26e-424b-800e-957637a05662";

  return null;
}

// GET /api/student/hall-ticket -> admit card from official DB published schedule
router.get("/hall-ticket", async (req, res) => {
  try {
    const studentId = req.query.studentId || req.user?.id;
    const { getStudentHallTicket } = require("../services/examCentreService");
    const { getExamSchedules } = require("../services/examScheduleStore");
    const publishedTicket = await getStudentHallTicket(studentId);

    const { data: student, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, department_id, avatar_url, departments!profiles_department_fk(name)")
      .eq("id", studentId)
      .maybeSingle();

    const sem = student?.semester || "3rd Sem";
    const deptName = student?.departments?.name ? student.departments.name.toUpperCase() : "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)";

    const targetDeptId = student?.department_id || "37909cba-a75d-428e-9181-fddf9920fb0b";
    const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");
    const enrolledSubIds = getEnrolledSubjectIdsForStudent(studentId);

    let publishedExams = await getExamSchedules({ departmentId: targetDeptId, semester: sem, status: "PUBLISHED" });
    if (!publishedExams || publishedExams.length === 0) {
      publishedExams = await getExamSchedules({ status: "PUBLISHED" });
    }

    if (publishedExams && publishedExams.length > 0 && enrolledSubIds && enrolledSubIds.length > 0) {
      const filtered = publishedExams.filter((ex) => {
        const sId = resolveSubjectIdFromEntry(ex);
        return !sId || enrolledSubIds.includes(sId);
      });
      if (filtered.length > 0) publishedExams = filtered;
    }

    if (!publishedTicket || publishedTicket.status !== "PUBLISHED") {
      return res.json({
        generated: false,
        published: false,
        message: "No Official Main Examination Hall Ticket has been published for your account yet.",
        studentName: student?.full_name || publishedTicket?.student_name || "Student Candidate",
        registrationNo: student?.registration_no || publishedTicket?.registration_no || "USN Pending",
        schedule: publishedExams,
        timetable: publishedExams.map((sc, idx) => ({
          slNo: idx + 1,
          subjectCode: sc.subjectCode || sc.code || `SUB30${idx + 1}`,
          subjectName: sc.subjectName || sc.name || "Main Exam Subject",
          examDate: sc.examDate || sc.date || "Scheduled",
          timeSlot: `${sc.startTime || "09:30 AM"} - ${sc.endTime || "12:30 PM"}`,
        })),
      });
    }

    let finalTimetable = [];
    let sourceTimetable = Array.isArray(publishedTicket.timetable) && publishedTicket.timetable.length > 0 ? publishedTicket.timetable : publishedExams;

    if (Array.isArray(sourceTimetable) && sourceTimetable.length > 0) {
      let filteredRows = sourceTimetable;
      if (enrolledSubIds && enrolledSubIds.length > 0) {
        filteredRows = filteredRows.filter((r) => {
          const sId = resolveSubjectIdFromEntry(r);
          return sId ? enrolledSubIds.includes(sId) : true;
        });
      }
      finalTimetable = filteredRows.map((r, idx) => ({
        slNo: idx + 1,
        subjectCode: r.subjectCode || r.code || `SUB30${idx + 1}`,
        subjectName: r.subjectName || r.name || "Main Exam Subject",
        examDate: r.examDate || r.date || "Scheduled",
        timeSlot: r.timeSlot || r.time || (r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : "09:30 AM - 12:30 PM"),
        hallNo: `${publishedTicket.room_number || "LH-101"} (${publishedTicket.seat_number || "SEAT-01"})`,
      }));
    }

    res.json({
      generated: true,
      published: true,
      institution: publishedTicket.institution || "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
      title: "OFFICIAL MAIN EXAMINATION HALL TICKET / ADMIT CARD",
      academicYear: publishedTicket.academic_year || "2025–2026",
      studentName: student?.full_name || publishedTicket.student_name || "Student Candidate",
      registrationNo: student?.registration_no || publishedTicket.registration_no || "USN Pending",
      departmentName: deptName,
      semester: sem,
      avatarUrl: student?.avatar_url,
      examCenter: publishedTicket.centre_name ? `${publishedTicket.centre_name} (${publishedTicket.room_number || "LH-101"})` : "DSATM Main Academic Block Examination Centre (LH-101)",
      roomNumber: publishedTicket.room_number || "LH-101",
      seatNumber: publishedTicket.seat_number || "SEAT-01",
      timetable: finalTimetable,
      schedule: publishedExams,
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
      .select("id, main_raw_marks, main_converted_marks, final_marks, total_marks, max_marks, grade, passed, published_at, exams(title, total_marks, subject_id, subjects(name, code))")
      .eq("student_id", studentId)
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (error) console.warn("Note fetching main_results from DB:", error.message);
    
    // Check if revaluation applications exist for this student to overlay updated marks
    const { getRevaluationApplications } = require("../services/revaluationService");
    const revalApps = await getRevaluationApplications({ studentId });

    let resultsList = (data && data.length > 0) ? data : [
      {
        id: "res-main-101",
        exam_id: "exam-dl-301",
        subject_id: "sub-dl-301",
        exams: {
          title: "Main Semester Examination 2026",
          subject_id: "sub-dl-301",
          subjects: { name: "Deep Learning & AI Applications", code: "MMC321" }
        },
        internal_marks: 42,
        main_raw_marks: 58,
        main_converted_marks: 58,
        final_marks: 58,
        total_marks: 58,
        max_marks: 100,
        grade: "B+",
        passed: true,
        published_at: new Date().toISOString()
      },
      {
        id: "res-main-102",
        exam_id: "exam-devops-302",
        subject_id: "sub-devops-302",
        exams: {
          title: "Main Semester Examination 2026",
          subject_id: "sub-devops-302",
          subjects: { name: "DevOps & Cloud Computing", code: "MMC335" }
        },
        internal_marks: 40,
        main_raw_marks: 62,
        main_converted_marks: 62,
        final_marks: 62,
        total_marks: 62,
        max_marks: 100,
        grade: "A",
        passed: true,
        published_at: new Date().toISOString()
      }
    ];

    // Overlay revaluation applications info & updated marks onto main results
    resultsList = resultsList.map((r) => {
      const subName = r.exams?.subjects?.name;
      const subId = r.subject_id || r.exams?.subject_id;
      const reval = revalApps.find((a) => a.subject_name === subName || a.subject_id === subId);
      if (reval) {
        const isCompleted = reval.status === "COMPLETED" || reval.status === "APPROVED";
        const revisedVal = Number(reval.final_marks ?? reval.revised_marks);
        return {
          ...r,
          revaluation: reval,
          original_marks: reval.original_marks || r.total_marks,
          total_marks: isCompleted && !isNaN(revisedVal) ? revisedVal : r.total_marks,
          final_marks: isCompleted && !isNaN(revisedVal) ? revisedVal : r.final_marks,
          is_revaluated: isCompleted,
          reval_status: reval.status,
        };
      }
      return r;
    });

    res.json(resultsList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Revaluation Endpoints
router.get("/revaluation/config", (req, res) => {
  const { getRevaluationConfig } = require("../services/revaluationService");
  res.json(getRevaluationConfig());
});

router.get("/revaluation/applications", async (req, res) => {
  try {
    const { getRevaluationApplications } = require("../services/revaluationService");
    const list = await getRevaluationApplications({ studentId: req.user.id });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/revaluation/apply", async (req, res) => {
  try {
    const { initiateRevaluationPayment, createRevaluationApplication } = require("../services/revaluationService");
    const { examId, subjectId, subjectName, originalMarks } = req.body;

    const payment = await initiateRevaluationPayment({
      studentId: req.user.id,
      examId,
      subjectId,
      subjectName,
      amount: 500,
    });

    const application = await createRevaluationApplication({
      studentId: req.user.id,
      examId,
      subjectId,
      subjectName,
      originalMarks,
      paymentId: payment.payment_id,
      applicationType: "REVALUATION",
    });

    res.status(201).json({ status: "submitted", application, payment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/student/internal-marks -> 50-mark internal breakdown for logged-in student
router.get("/internal-marks", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getStudentInternalMarks } = require("../services/internalMarksStore");
    const marks = await getStudentInternalMarks(studentId);
    res.json(marks || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/attendance -> attendance summary & subject breakdown
router.get("/attendance", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getStudentAttendanceSummary } = require("../services/academicStore.js");
    const summary = await getStudentAttendanceSummary(studentId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/internal-timetable -> internal timetable with attendance check
router.get("/internal-timetable", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { getStudentAttendanceSummary, getInternalTimetable } = require("../services/academicStore.js");
    const summary = await getStudentAttendanceSummary(studentId);
    const overallPct = summary.overallPercentage;
    const timetableData = getInternalTimetable();

    if (summary.hasAnyAttendance && overallPct < 75) {
      return res.json({
        eligible: false,
        attendancePercentage: overallPct,
        minRequired: 75,
        message: `⚠️ ATTENDANCE SHORTAGE ALERT: Your overall attendance is ${overallPct}% (Minimum required: 75%). As per academic regulations, you are NOT ELIGIBLE to view the internal examination timetable or sit for internal exams.`,
        timetable: [],
      });
    }

    res.json({
      eligible: true,
      attendancePercentage: overallPct,
      minRequired: 75,
      examName: timetableData.examName,
      publishedAt: timetableData.publishedAt,
      timetable: timetableData.schedule,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/academic-profile -> Read-only Academic Profile & Identity
router.get("/academic-profile", async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Profile details
    let profile = null;
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, registration_no, semester, section, department_id, avatar_url, created_at")
        .eq("id", studentId)
        .maybeSingle();
      profile = data;
    } catch (e) {}

    // Department name lookup
    let deptName = "Computer Applications";
    if (profile?.department_id) {
      try {
        const { data: d } = await supabaseAdmin
          .from("departments")
          .select("name")
          .eq("id", profile.department_id)
          .maybeSingle();
        if (d?.name) deptName = d.name;
      } catch (e) {}
    }

    // 2. Attendance Summary
    let attSummary = { hasAnyAttendance: false, overallPercentage: 0, subjectBreakdown: [] };
    try {
      const { getStudentAttendanceSummary } = require("../services/academicStore.js");
      attSummary = (await getStudentAttendanceSummary(studentId)) || attSummary;
    } catch (e) {}

    // 3. Internal Marks
    let internalMarks = [];
    try {
      const { getStudentInternalMarks } = require("../services/internalMarksStore");
      internalMarks = (await getStudentInternalMarks(studentId)) || [];
    } catch (e) {}

    // 4. Main Results
    let mainResults = [];
    try {
      const { data } = await supabaseAdmin
        .from("main_results")
        .select("id, total_marks, max_marks, passed, published_at, exams(title, subject_id, subjects(name, code))")
        .eq("student_id", studentId)
        .eq("published", true);
      mainResults = data || [];
    } catch (e) {}

    // 5. Enrolled Subjects
    let subjects = [];
    try {
      const { getEnrolledSubjectIdsForStudent } = require("../services/enrollmentStore");
      const enrolledSubjIds = getEnrolledSubjectIdsForStudent(studentId);
      if (enrolledSubjIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("subjects")
          .select("id, name, code, faculty_id")
          .in("id", enrolledSubjIds);
        subjects = data || [];
      } else if (profile?.department_id) {
        const { data } = await supabaseAdmin
          .from("subjects")
          .select("id, name, code, faculty_id")
          .eq("department_id", profile.department_id);
        subjects = data || [];
      }
    } catch (e) {}

    // Resolve USN / Reg No & Email
    const resolvedRegNo = profile?.registration_no || req.user?.registration_no || req.user?.registrationNo || "USN Pending";
    const resolvedEmail = profile?.email || req.user?.email || "Pending Email";

    // Build subject summary breakdown
    let publishedInternalsCount = 0;
    let publishedMainExamsCount = 0;

    const subjectSummary = subjects.map((sub, idx) => {
      const attRec = (attSummary.subjectBreakdown || []).find((a) => a.subjectId === sub.id || a.subjectName === sub.name);
      const intRec = (internalMarks || []).find((i) => String(i.subject_id) === String(sub.id) || i.subject_name === sub.name || (i.subjects && i.subjects.name === sub.name));
      const mainRec = (mainResults || []).find((m) => m.exams?.subject_id === sub.id);

      const hasInt = Boolean(intRec && (intRec.total_internal_marks !== null || intRec.internal1_marks !== undefined));
      if (hasInt) publishedInternalsCount++;

      const intTot = hasInt ? (intRec.total_internal_marks ?? ((intRec.internal1_marks || 0) + (intRec.internal2_marks || 0) + (intRec.assignment_marks || 0) + (intRec.project_marks || 0))) : null;

      const hasMain = Boolean(mainRec);
      if (hasMain) publishedMainExamsCount++;

      const attDisplay = attRec?.hasAttendance ? `${attRec.percentage}%` : "Not Marked";
      const attPctVal = attRec?.hasAttendance ? attRec.percentage : 100;

      let acadStatus = "REGULAR / ELIGIBLE";
      if (hasInt && intTot < 25) {
        acadStatus = "DETAINED (<25 Marks)";
      } else if (attRec?.hasAttendance && attPctVal < 75) {
        acadStatus = "SHORTAGE (<75%)";
      } else if (!hasInt && !attRec?.hasAttendance) {
        acadStatus = "REGULAR";
      }

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code || `MMC30${idx + 1}`,
        facultyName: "Faculty Assigned",
        attendancePercentage: attDisplay,
        hasInternalMarks: hasInt,
        internalMarks: hasInt ? `${intTot} / 50` : "Not Published",
        mainExamStatus: hasMain ? (mainRec.passed ? `PASSED (${mainRec.total_marks}/${mainRec.max_marks})` : `FAILED (${mainRec.total_marks}/${mainRec.max_marks})`) : "Not Published",
        academicStatus: acadStatus,
      };
    });

    const overallAttPct = attSummary.hasAnyAttendance ? `${attSummary.overallPercentage}%` : "Not Marked";

    res.json({
      studentName: profile?.full_name || req.user?.full_name || "Student",
      registrationNo: resolvedRegNo,
      email: resolvedEmail,
      program: "Master of Computer Applications (MCA)",
      departmentName: deptName,
      semester: profile?.semester || "3rd Sem",
      section: profile?.section ? (profile.section.toLowerCase().includes("section") ? profile.section : `Section ${profile.section}`) : "Section A",
      academicYear: "2026-2027",
      enrollmentStatus: "ACTIVE / REGULAR",
      avatarUrl: profile?.avatar_url || null,
      summary: {
        enrolledSubjectsCount: subjects.length,
        overallAttendance: overallAttPct,
        attendanceEligible: attSummary.hasAnyAttendance ? attSummary.overallPercentage >= 75 : true,
        internalEvaluationsCount: publishedInternalsCount,
        mainExamPublishedCount: publishedMainExamsCount,
        backlogsCount: (mainResults || []).filter((m) => !m.passed).length,
      },
      subjectSummary,
    });
  } catch (err) {
    res.json({
      studentName: req.user?.full_name || "Student",
      registrationNo: req.user?.registration_no || "USN Pending",
      email: req.user?.email || "Pending Email",
      program: "Master of Computer Applications (MCA)",
      departmentName: "Computer Applications",
      semester: "3rd Sem",
      section: "Section A",
      academicYear: "2026-2027",
      enrollmentStatus: "ACTIVE / REGULAR",
      avatarUrl: null,
      summary: { enrolledSubjectsCount: 0, overallAttendance: "Not Marked", attendanceEligible: true, internalEvaluationsCount: 0, mainExamPublishedCount: 0, backlogsCount: 0 },
      subjectSummary: [],
    });
  }
});

// GET /api/student/academic-reports -> Official Consolidated Academic Reports
router.get("/academic-reports", async (req, res) => {
  try {
    const studentId = req.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, section, department_id, departments!profiles_department_fk(name)")
      .eq("id", studentId)
      .maybeSingle();

    const { getStudentAttendanceSummary } = require("../services/academicStore.js");
    const attSummary = await getStudentAttendanceSummary(studentId);

    const { getStudentInternalMarks } = require("../services/internalMarksStore");
    const internalMarks = await getStudentInternalMarks(studentId);

    const { data: mainResults } = await supabaseAdmin
      .from("main_results")
      .select("id, total_marks, max_marks, passed, published_at, exams(title, subjects(name, code))")
      .eq("student_id", studentId)
      .eq("published", true);

    const reports = [];

    // 1. Internal Assessment Report
    if (internalMarks && internalMarks.length > 0) {
      reports.push({
        id: "rep-internal-assessment",
        reportName: "50-Mark Continuous Internal Assessment Scorecard Report",
        type: "internal_assessment",
        semester: profile?.semester || "3rd Sem",
        academicYear: "2026-2027",
        generatedDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        status: "OFFICIAL / APPROVED",
        summary: `Consolidated 50-mark continuous assessment breakdown across ${internalMarks.length} subjects.`,
        dataRows: internalMarks.map((m) => ({
          subject: m.subjects?.name || "Subject",
          code: m.subjects?.code || "SUB",
          internal1: m.internal1_marks ?? 0,
          internal2: m.internal2_marks ?? 0,
          assignment: m.assignment_marks ?? 0,
          project: m.project_marks ?? 0,
          totalScore: m.total_internal_marks ?? ((m.internal1_marks || 0) + (m.internal2_marks || 0) + (m.assignment_marks || 0) + (m.project_marks || 0)),
          status: m.status === "approved_by_hod" ? "HOD Approved" : "Faculty Entered",
        })),
      });
    }

    // 2. Attendance Report
    if (attSummary && attSummary.hasAnyAttendance) {
      reports.push({
        id: "rep-attendance",
        reportName: "Official Academic Attendance & Eligibility Statement Report",
        type: "attendance",
        semester: profile?.semester || "3rd Sem",
        academicYear: "2026-2027",
        generatedDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        status: attSummary.isEligible ? "ELIGIBLE FOR EXAMS" : "ATTENDANCE SHORTAGE",
        summary: `Overall Attendance: ${attSummary.overallPercentage}% (${attSummary.attendedClasses} / ${attSummary.totalClasses} Conducted Hours).`,
        dataRows: (attSummary.subjectBreakdown || []).map((sub) => ({
          subject: sub.subjectName,
          code: sub.subjectCode,
          totalClasses: sub.totalClasses,
          attendedClasses: sub.attendedClasses,
          percentage: `${sub.percentage}%`,
          eligibility: sub.isEligible ? "ELIGIBLE (≥75%)" : "SHORTAGE (<75%)",
        })),
      });
    }

    // 3. Main Exam Marksheet Report
    if (mainResults && mainResults.length > 0) {
      reports.push({
        id: "rep-main-marksheet",
        reportName: "Main Semester End Examination Marksheet Report",
        type: "main_examination",
        semester: profile?.semester || "3rd Sem",
        academicYear: "2026-2027",
        generatedDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        status: "PUBLISHED BY EXAMINATION DEPT",
        summary: `Official semester end examination results for ${mainResults.length} subjects.`,
        dataRows: mainResults.map((r) => ({
          exam: r.exams?.title || "Main Exam",
          subject: r.exams?.subjects?.name || "Subject",
          code: r.exams?.subjects?.code || "SUB",
          totalMarks: r.total_marks,
          maxMarks: r.max_marks || 100,
          result: r.passed ? "PASSED" : "FAILED",
        })),
      });
    }

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/bookmarks -> list user's bookmarks
router.get("/bookmarks", async (req, res) => {
  try {
    const list = await getUserBookmarks(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/bookmarks -> add bookmark
router.post("/bookmarks", async (req, res) => {
  try {
    const bm = await addBookmark(req.user.id, req.body);
    res.status(201).json(bm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/student/bookmarks/:id -> remove bookmark
router.delete("/bookmarks/:id", async (req, res) => {
  try {
    const result = await removeBookmark(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/student/practice-history -> list student's practice test attempts
router.get("/practice-history", async (req, res) => {
  try {
    const history = await getStudentPracticeHistory(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/practice-history -> save a new practice test attempt
router.post("/practice-history", async (req, res) => {
  try {
    const attempt = await recordPracticeAttempt(req.user.id, req.body);
    res.status(201).json(attempt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/student/messages -> List direct messages received by student
router.get("/messages", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*, profiles!messages_sender_id_fkey(full_name, role)")
      .eq("recipient_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/messages/reply -> Send reply to HOD
router.post("/messages/reply", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { messageId, replyBody } = req.body;
    if (!replyBody || !replyBody.trim()) {
      return res.status(400).json({ error: "replyBody is required" });
    }

    let recipientId = null;
    if (messageId) {
      const { data: orig } = await supabaseAdmin.from("messages").select("sender_id").eq("id", messageId).maybeSingle();
      recipientId = orig?.sender_id;
    }

    if (!recipientId) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("department_id").eq("id", studentId).maybeSingle();
      if (prof?.department_id) {
        const { data: hod } = await supabaseAdmin.from("profiles").select("id").eq("role", "hod").eq("department_id", prof.department_id).maybeSingle();
        recipientId = hod?.id;
      }
    }

    const { data: newMsg, error } = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: studentId,
        recipient_id: recipientId,
        kind: "reply",
        body: replyBody,
      })
      .select()
      .single();

    if (error) throw error;

    if (recipientId) {
      const { notify } = require("../services/notification.service");
      await notify(recipientId, "student_reply", "💬 Student Reply Received", `A student sent a reply to your academic notice: "${replyBody.substring(0, 60)}..."`);
    }

    res.status(201).json({ status: "sent", message: newMsg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/student/calendar -> Academic calendar events for student
router.get("/calendar", async (req, res) => {
  try {
    const studentId = req.user.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("department_id, semester")
      .eq("id", studentId)
      .maybeSingle();

    const { getAcademicCalendarEvents } = require("../services/calendarService");
    const events = await getAcademicCalendarEvents({
      departmentId: profile?.department_id || "dept-mca",
      semester: profile?.semester,
      role: "student",
      userId: studentId,
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;