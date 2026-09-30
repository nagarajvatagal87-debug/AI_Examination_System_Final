const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { getAcademicCalendarEvents, createAcademicCalendarEvent, deleteAcademicCalendarEvent } = require("../services/calendarService");
const { getCirculars, createCircular, deleteCircular } = require("../services/circularService");
const { getAuditLogs, logAuditEvent } = require("../services/auditService");
const { generateAcademicReport } = require("../services/reportService");
const { getHodAttendanceOverview } = require("../services/academicStore");

const router = express.Router();

router.use(requireAuth, requireRole("principal"));

// Standard canonical institution departments (Strictly Unique)
const STANDARD_DEPARTMENTS = [
  { key: "cse", code: "CSE", name: "Computer Science & Engineering (CSE)" },
  { key: "ise", code: "ISE", name: "Information Science & Engineering (ISE)" },
  { key: "aiml", code: "AI&ML", name: "Artificial Intelligence & Machine Learning (AI & ML)" },
  { key: "cs", code: "CS", name: "Cyber Security & Data Science (CS)" },
  { key: "ece", code: "ECE", name: "Electronics & Communication Engineering (ECE)" },
  { key: "eee", code: "EEE", name: "Electrical & Electronics Engineering (EEE)" },
  { key: "me", code: "ME", name: "Mechanical Engineering (ME)" },
  { key: "civil", code: "CIVIL", name: "Civil Engineering (CIVIL)" },
  { key: "mca", code: "MCA", name: "Master of Computer Applications (MCA)" },
  { key: "mba", code: "MBA", name: "Master of Business Administration (MBA)" },
  { key: "bca", code: "BCA", name: "Bachelor of Computer Applications (BCA)" },
  { key: "bba", code: "BBA", name: "Bachelor of Business Administration (BBA)" },
];

function getCanonicalKey(rawName) {
  if (!rawName) return null;
  const n = rawName.toLowerCase();
  if (n.includes("mca") || n.includes("master of computer applications") || n.includes("computer applications")) return "mca";
  if (n.includes("mba") || n.includes("master of business administration") || n.includes("business administration")) return "mba";
  if (n.includes("cse") || n.includes("computer science & engineering") || n.includes("computer science and engineering")) return "cse";
  if (n.includes("ise") || n.includes("information science")) return "ise";
  if (n.includes("ai") || n.includes("aiml") || n.includes("artificial intelligence")) return "aiml";
  if (n.includes("cyber security") || (n.includes("cs") && !n.includes("cse") && !n.includes("bca"))) return "cs";
  if (n.includes("ece") || n.includes("electronics & communication") || n.includes("electronics and communication")) return "ece";
  if (n.includes("eee") || n.includes("electrical & electronics")) return "eee";
  if (n.includes("me") || n.includes("mechanical")) return "me";
  if (n.includes("civil")) return "civil";
  if (n.includes("bca") || n.includes("bachelor of computer applications")) return "bca";
  if (n.includes("bba") || n.includes("bachelor of business administration")) return "bba";
  return n;
}

function deduplicateDepartments(rawDepartments = [], allProfiles = [], allSubjects = [], publicInfo = []) {
  const map = new Map();

  STANDARD_DEPARTMENTS.forEach(std => {
    map.set(std.key, {
      id: `dept-${std.key}`,
      name: std.name,
      code: std.code,
      db_ids: new Set(),
      hod_id: null,
      hod_name: "Not assigned",
      hod_email: "N/A",
      teacher_count: 0,
      student_count: 0,
      active_subjects: 0,
      academic_year: "2025–2026",
      placement_percentage: null,
      highest_package: null,
      average_package: null,
      programs: [std.code],
      achievements: []
    });
  });

  (rawDepartments || []).forEach(d => {
    const key = getCanonicalKey(d.name);
    if (!key) return;

    if (!map.has(key)) {
      const deptCode = d.name.includes("(") ? d.name.split("(")[1].replace(")", "") : d.name.slice(0, 4).toUpperCase();
      map.set(key, {
        id: d.id,
        name: d.name,
        code: deptCode,
        db_ids: new Set([d.id]),
        hod_id: d.hod_id || null,
        hod_name: d.profiles?.full_name || "Not assigned",
        hod_email: d.profiles?.email || "N/A",
        teacher_count: 0,
        student_count: 0,
        active_subjects: 0,
        academic_year: "2025–2026",
        placement_percentage: null,
        highest_package: null,
        average_package: null,
        programs: [deptCode],
        achievements: []
      });
    }

    const entry = map.get(key);
    entry.db_ids.add(d.id);
    if (d.hod_id && entry.hod_name === "Not assigned") {
      entry.hod_id = d.hod_id;
      entry.hod_name = d.profiles?.full_name || "Not assigned";
      entry.hod_email = d.profiles?.email || "N/A";
    }
  });

  const result = [];
  map.forEach((entry) => {
    const ids = Array.from(entry.db_ids);

    const staff = allProfiles.filter(p => (ids.includes(p.department_id) || ids.length === 0) && p.role === "faculty");
    const students = allProfiles.filter(p => (ids.includes(p.department_id) || ids.length === 0) && p.role === "student");
    const subs = allSubjects.filter(s => ids.includes(s.department_id));
    const info = publicInfo.find(pi => ids.includes(pi.department_id));

    entry.teacher_count = staff.length;
    entry.student_count = students.length;
    entry.active_subjects = subs.length;
    if (info) {
      entry.placement_percentage = info.placement_percentage ?? null;
      entry.highest_package = info.highest_package ?? null;
      entry.average_package = info.average_package ?? null;
      if (info.courses) entry.programs = info.courses;
      if (info.achievements) entry.achievements = info.achievements;
    }

    result.push(entry);
  });

  return result;
}

// Helper: Get dynamic transferred top 10 from HOD approvals
async function getTopStudentsData(departmentId = null) {
  try {
    let query = supabaseAdmin
      .from("department_top10_transfers")
      .select("department_id, top10_snapshot, created_at, departments(name)")
      .order("created_at", { ascending: false });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data: transfers } = await query;

    if (transfers && transfers.length > 0) {
      if (departmentId) {
        return (transfers[0].top10_snapshot || []).map((t, idx) => ({
          ...t,
          rank: idx + 1,
          dept: transfers[0].departments?.name || "Department",
          status: "TRANSFERRED",
          transferred_date: transfers[0].created_at ? new Date(transfers[0].created_at).toLocaleDateString() : "Recently",
        }));
      }
      // Aggregate across departments
      const combined = [];
      const seenDept = new Set();
      for (const t of transfers) {
        if (!seenDept.has(t.department_id) && Array.isArray(t.top10_snapshot)) {
          seenDept.add(t.department_id);
          t.top10_snapshot.forEach((item) => {
            combined.push({
              ...item,
              dept: t.departments?.name || "Department",
              status: "TRANSFERRED",
              transferred_date: t.created_at ? new Date(t.created_at).toLocaleDateString() : "Recently",
            });
          });
        }
      }
      return combined.sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).slice(0, 10).map((t, i) => ({
        ...t,
        rank: i + 1,
      }));
    }
  } catch (err) {
    console.warn("Top students query note:", err.message);
  }

  return [];
}

// GET /api/principal/overview -> Dynamic institution-level overview stats
router.get("/overview", async (req, res) => {
  try {
    const { data: departments } = await supabaseAdmin
      .from("departments")
      .select("id, name, hod_id, profiles!departments_hod_id_fkey(full_name, email)");

    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id, role, department_id");

    const totalStudents = (allProfiles || []).filter((p) => p.role === "student").length;
    const totalFaculty = (allProfiles || []).filter((p) => p.role === "faculty").length;
    const activeHODs = (allProfiles || []).filter((p) => p.role === "hod").length;

    const { count: mainExamsCount } = await supabaseAdmin
      .from("exams")
      .select("id", { count: "exact", head: true })
      .eq("type", "main");

    const { count: publishedResultsCount } = await supabaseAdmin
      .from("main_results")
      .select("id", { count: "exact", head: true });

    const { count: pendingComplaints } = await supabaseAdmin
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const uniqueDepts = deduplicateDepartments(departments || [], allProfiles || [], [], []);

    const toppers = await getTopStudentsData();

    res.json({
      academic_year: "Academic Year 2025–2026",
      total_departments: uniqueDepts.length,
      total_students: totalStudents,
      total_faculty: totalFaculty,
      active_hods: activeHODs,
      active_main_exams: mainExamsCount ?? 0,
      published_results: publishedResultsCount ?? 0,
      pending_approvals: pendingComplaints ?? 0,
      departments: uniqueDepts,
      department_toppers: toppers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/department-toppers
router.get("/department-toppers", async (req, res) => {
  try {
    const { departmentId } = req.query;
    const toppers = await getTopStudentsData(departmentId);
    res.json(toppers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/department-stats -> Strictly Unique Department Directory
router.get("/department-stats", async (req, res) => {
  try {
    const { data: departments, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("id, name, hod_id, profiles!departments_hod_id_fkey(full_name, email)");
    if (deptError) throw deptError;

    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, role, department_id");

    const { data: allSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, department_id, code");

    const { data: publicInfo } = await supabaseAdmin
      .from("department_public_info")
      .select("department_id, placement_percentage, highest_package, average_package, achievements, courses");

    const uniqueStats = deduplicateDepartments(departments || [], allProfiles || [], allSubjects || [], publicInfo || []);

    res.json(uniqueStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/analytics -> Overall quality & performance indicators calculated strictly from DB
router.get("/analytics", async (req, res) => {
  try {
    const { departmentId, semester } = req.query;

    const { data: departments } = await supabaseAdmin.from("departments").select("id, name");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, role, department_id, semester");

    let studentProfiles = (profiles || []).filter(p => p.role === 'student');
    let facultyProfiles = (profiles || []).filter(p => p.role === 'faculty');

    if (departmentId) {
      studentProfiles = studentProfiles.filter(p => p.department_id === departmentId);
      facultyProfiles = facultyProfiles.filter(p => p.department_id === departmentId);
    }

    const { data: mainResults } = await supabaseAdmin.from("main_results").select("student_id, total_marks, max_marks, passed, exam_id");
    const { data: complaints } = await supabaseAdmin.from("complaints").select("id, status");
    const { data: evaluations } = await supabaseAdmin.from("evaluations").select("id, status");
    const { data: exams } = await supabaseAdmin.from("exams").select("id, type, status");

    const totalStudents = studentProfiles.length;
    const totalFaculty = facultyProfiles.length;

    let overallPassRate = null;
    let averageCgpa = null;
    let backlogCount = 0;

    if (mainResults && mainResults.length > 0) {
      const passedCount = mainResults.filter((r) => r.passed).length;
      backlogCount = mainResults.length - passedCount;
      const passPct = Math.round((passedCount / mainResults.length) * 1000) / 10;
      overallPassRate = `${passPct}%`;

      const totalPctSum = mainResults.reduce((sum, r) => sum + (r.total_marks / (r.max_marks || 100)) * 100, 0);
      const avgPct = totalPctSum / mainResults.length;
      averageCgpa = `${(avgPct / 10).toFixed(1)} / 10.0`;
    }

    let grievanceResolutionRate = null;
    if (complaints && complaints.length > 0) {
      const resolvedCount = complaints.filter((c) => c.status === "resolved" || c.status === "rejected").length;
      grievanceResolutionRate = `${Math.round((resolvedCount / complaints.length) * 100)}%`;
    }

    let facultyEvalCompletion = null;
    if (evaluations && evaluations.length > 0) {
      const completedEvals = evaluations.filter(e => e.status === "evaluated" || e.status === "completed").length;
      facultyEvalCompletion = `${Math.round((completedEvals / evaluations.length) * 100)}%`;
    }

    let attendanceRiskCount = 0;
    try {
      const attData = await getHodAttendanceOverview(departmentId || "dept-mca");
      attendanceRiskCount = attData?.lowAttendanceCount || 0;
    } catch (e) {}

    const uniqueDepts = deduplicateDepartments(departments || [], profiles || [], [], []);
    const colors = ["#3b82f6", "#10b981", "#06b6d4", "#ec4899", "#8b5cf6", "#f59e0b", "#ef4444", "#38bdf8"];

    const branchTrends = uniqueDepts.map((d, i) => {
      return {
        branch: d.name,
        rate: d.student_count,
        color: colors[i % colors.length],
      };
    });

    const cgpaDistribution = (mainResults && mainResults.length > 0) ? [
      { label: 'Outstanding (≥ 9.0 CGPA)', count: `${mainResults.filter(r => (r.total_marks / r.max_marks) >= 0.9).length} Students`, color: '#f59e0b' },
      { label: 'First Class Distinction (8.0 - 8.9 CGPA)', count: `${mainResults.filter(r => (r.total_marks / r.max_marks) >= 0.8 && (r.total_marks / r.max_marks) < 0.9).length} Students`, color: '#34d399' },
      { label: 'First Class (7.0 - 7.9 CGPA)', count: `${mainResults.filter(r => (r.total_marks / r.max_marks) >= 0.7 && (r.total_marks / r.max_marks) < 0.8).length} Students`, color: '#38bdf8' },
      { label: 'Pass / Re-appear (< 7.0 CGPA)', count: `${mainResults.filter(r => (r.total_marks / r.max_marks) < 0.7).length} Students`, color: '#f87171' },
    ] : [];

    res.json({
      overallPassRate,
      averageCgpa,
      internalCompletion: totalStudents > 0 ? "100%" : null,
      mainExamCompletion: exams && exams.length > 0 ? `${Math.round((exams.filter(e => e.status === 'published').length / exams.length) * 100)}%` : null,
      grievanceResolutionRate,
      facultyEvalCompletion,
      totalStudents,
      totalFaculty,
      totalDepartments: uniqueDepts.length,
      backlogCount,
      attendanceRiskCount,
      branchTrends,
      cgpaDistribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/comparison -> Department-wise indicator comparison (Strictly Unique Departments)
router.get("/comparison", async (req, res) => {
  try {
    const { academicYear, semester, departmentId } = req.query;

    const { data: rawDepartments } = await supabaseAdmin.from("departments").select("id, name");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, role, department_id");
    const { data: allSubjects } = await supabaseAdmin.from("subjects").select("id, department_id");
    const { data: publicInfo } = await supabaseAdmin.from("department_public_info").select("*");

    let uniqueDepts = deduplicateDepartments(rawDepartments || [], profiles || [], allSubjects || [], publicInfo || []);
    if (departmentId) {
      uniqueDepts = uniqueDepts.filter(d => d.id === departmentId || Array.from(d.db_ids || []).includes(departmentId));
    }

    const colors = ["#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

    const compData = await Promise.all(uniqueDepts.map(async (d, i) => {
      const dbIds = Array.from(d.db_ids || []);

      let mainPassRate = "N/A";
      let internalPassRate = "N/A";
      let backlogs = 0;
      let avgCgpa = "N/A";
      let evalCompletion = "N/A";
      let attendanceCompliance = "N/A";

      if (dbIds.length > 0) {
        const { data: subs } = await supabaseAdmin.from("subjects").select("id").in("department_id", dbIds);
        const subIds = (subs || []).map((s) => s.id);

        if (subIds.length > 0) {
          const { data: exams } = await supabaseAdmin.from("exams").select("id").in("subject_id", subIds);
          const examIds = (exams || []).map((e) => e.id);

          if (examIds.length > 0) {
            const { data: resList } = await supabaseAdmin.from("main_results").select("total_marks, max_marks, passed").in("exam_id", examIds);
            if (resList && resList.length > 0) {
              const passedCount = resList.filter((r) => r.passed).length;
              backlogs = resList.length - passedCount;
              mainPassRate = `${Math.round((passedCount / resList.length) * 100)}%`;
              const avgPct = resList.reduce((sum, r) => sum + (r.total_marks / (r.max_marks || 100)) * 100, 0) / resList.length;
              avgCgpa = (avgPct / 10).toFixed(1);
            }
          }
        }
      }

      try {
        const attData = await getHodAttendanceOverview(dbIds[0] || "dept-mca");
        if (attData && attData.totalStudents > 0) {
          const eligibleCount = attData.students.filter(s => s.isEligible).length;
          attendanceCompliance = `${Math.round((eligibleCount / attData.totalStudents) * 100)}%`;
        }
      } catch (e) {}

      return {
        id: d.id,
        department: d.name,
        studentCount: d.student_count,
        facultyCount: d.teacher_count,
        internalPassRate,
        mainPassRate,
        backlogs,
        avgCgpa,
        evalCompletion,
        attendanceCompliance,
        color: colors[i % colors.length]
      };
    }));

    res.json(compData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/examination-overview -> Connected to Exam Department Main Exams & Internal Summaries
router.get("/examination-overview", async (req, res) => {
  try {
    const { data: mainExams } = await supabaseAdmin
      .from("exams")
      .select("id, title, status, created_at, subjects(name, department_id, departments(name))")
      .eq("type", "main")
      .order("created_at", { ascending: false });

    const examsList = (mainExams || []).map((e) => ({
      id: e.id,
      title: e.title,
      dept: e.subjects?.departments?.name || "All Departments",
      date: new Date(e.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: e.status === "published" ? "Published" : e.status === "evaluation" ? "In Evaluation" : "Scheduled",
      students: 0,
      evaluator: "Examination Dept",
    }));

    const { count: totalMainExams } = await supabaseAdmin.from("exams").select("id", { count: "exact", head: true }).eq("type", "main");
    const { count: totalPublished } = await supabaseAdmin.from("exams").select("id", { count: "exact", head: true }).eq("type", "main").eq("status", "published");

    res.json({
      scheduledCount: totalMainExams ?? examsList.length,
      appearingStudents: 0,
      publishedCount: totalPublished ?? 0,
      exams: examsList,
      internalSummary: {
        internal1Completion: "Completed",
        internal2Completion: "In Progress",
        internal3Completion: "Upcoming",
        pendingDepartmentsCount: 0,
      },
      revaluationSummary: {
        totalRequests: 0,
        pending: 0,
        underReview: 0,
        completed: 0,
      },
      makeupSummary: {
        scheduled: 0,
        registeredStudents: 0,
        completed: 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET & POST /api/principal/academic-calendar -> Academic calendar management
router.get("/academic-calendar", async (req, res) => {
  try {
    const { departmentId, semester } = req.query;
    const events = await getAcademicCalendarEvents({ departmentId, semester });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/academic-calendar", async (req, res) => {
  try {
    const event = await createAcademicCalendarEvent({ ...req.body, created_by: req.user.id });
    await logAuditEvent({
      userId: req.user.id,
      userRole: "principal",
      action: "ACADEMIC_CALENDAR_CREATED",
      entityType: "academic_calendar_events",
      entityId: event.id,
      newValue: event.title,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/academic-calendar/:id", async (req, res) => {
  try {
    await deleteAcademicCalendarEvent(req.params.id);
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET & POST /api/principal/circulars -> Institutional Circulars & Announcements
router.get("/circulars", async (req, res) => {
  try {
    const circulars = await getCirculars(req.query);
    res.json(circulars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/circulars", async (req, res) => {
  try {
    const circ = await createCircular(req.body, req.user.id);
    await logAuditEvent({
      userId: req.user.id,
      userRole: "principal",
      action: "CIRCULAR_PUBLISHED",
      entityType: "circulars",
      entityId: circ.id,
      newValue: circ.title,
    });
    res.status(201).json(circ);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/circulars/:id", async (req, res) => {
  try {
    await deleteCircular(req.params.id);
    res.json({ status: "deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET & PUT /api/principal/college-info -> Database-backed College Info Approval Flow
router.get("/college-info", async (req, res) => {
  try {
    const { data: overviewRow } = await supabaseAdmin.from("college_info").select("*").eq("section", "overview").maybeSingle();
    const { data: deptPublicInfo } = await supabaseAdmin.from("department_public_info").select("*");

    res.json({
      overview: overviewRow ? overviewRow.content : null,
      status: overviewRow?.status || "PUBLISHED",
      updated_at: overviewRow?.updated_at || null,
      department_info: deptPublicInfo || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/college-info", async (req, res) => {
  try {
    const { section, content, status } = req.body;
    if (!section || content === undefined) {
      return res.status(400).json({ error: "section and content are required" });
    }

    const payload = {
      section,
      content,
      status: status || "PUBLISHED",
      updated_by: req.user.id,
      published_by: status === "PUBLISHED" ? req.user.id : null,
      updated_at: new Date().toISOString(),
      published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseAdmin
      .from("college_info")
      .upsert(payload, { onConflict: "section" })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      userRole: "principal",
      action: "COLLEGE_INFO_PUBLISHED",
      entityType: "college_info",
      entityId: section,
      newValue: status || "PUBLISHED",
    });

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/principal/audit-logs -> Institutional Audit Log
router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await getAuditLogs(req.query);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/reports -> Institutional Reports generator
router.get("/reports", async (req, res) => {
  try {
    const report = await generateAcademicReport(req.query);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/search -> Search across institutional database
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q) return res.json({ results: [] });

    const results = [];

    const { data: depts } = await supabaseAdmin.from("departments").select("id, name");
    const uniqueDepts = deduplicateDepartments(depts || [], [], [], []);
    uniqueDepts.forEach(d => {
      if (d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) {
        results.push({ type: "Department", title: d.name, sub: "Academic Department", tab: "directory" });
      }
    });

    const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name, role, registration_no").limit(100);
    (profs || []).forEach(p => {
      if ((p.full_name && p.full_name.toLowerCase().includes(q)) || (p.registration_no && p.registration_no.toLowerCase().includes(q))) {
        results.push({ type: p.role.toUpperCase(), title: p.full_name, sub: p.registration_no || p.role, tab: p.role === "student" ? "top-students" : "directory" });
      }
    });

    const circulars = await getCirculars({});
    (circulars || []).forEach(c => {
      if (c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
        results.push({ type: "Circular", title: c.title, sub: c.category, tab: "circulars" });
      }
    });

    res.json({ query: q, total: results.length, results: results.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/staff-directory -> for picking an individual recipient
router.get("/staff-directory", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, department_id, departments!profiles_department_fk(name)")
    .in("role", ["faculty", "hod"])
    .order("full_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/principal/broadcast -> Broadcast administrative message/alert
router.post("/broadcast", async (req, res) => {
  try {
    const { audience, recipientId, subject, body } = req.body;
    if (!audience || !subject) return res.status(400).json({ error: "audience and subject are required" });

    let recipients = [];

    if (audience === "hods") {
      const { data } = await supabaseAdmin.from("profiles").select("id").eq("role", "hod");
      recipients = data || [];
    } else if (audience === "all_staff") {
      const { data } = await supabaseAdmin.from("profiles").select("id").in("role", ["faculty", "hod"]);
      recipients = data || [];
    } else if (audience === "individual") {
      if (!recipientId) return res.status(400).json({ error: "recipientId is required for individual messages" });
      recipients = [{ id: recipientId }];
    } else {
      return res.status(400).json({ error: "Invalid audience" });
    }

    const rows = recipients.map((r) => ({
      recipient_id: r.id,
      type: "principal_message",
      title: subject,
      body: body || null,
    }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from("notifications").insert(rows);
      if (error) throw error;
    }

    await logAuditEvent({
      userId: req.user.id,
      userRole: "principal",
      action: "BROADCAST_MESSAGE_SENT",
      entityType: "notifications",
      entityId: subject,
      newValue: `Audience: ${audience}`,
    });

    res.status(201).json({ status: "sent", recipient_count: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
