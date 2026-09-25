const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();

router.use(requireAuth, requireRole("principal"));

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
        return transfers[0].top10_snapshot || [];
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
            });
          });
        }
      }
      return combined.sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).slice(0, 10);
    }
  } catch (err) {
    console.warn("Top students query note:", err.message);
  }

  // Strictly return empty array if no HOD transfers exist yet
  return [];
}

// GET /api/principal/overview -> live departments + top performers
router.get("/overview", async (req, res) => {
  try {
    const { data: departments } = await supabaseAdmin
      .from("departments")
      .select("id, name, hod_id, profiles!departments_hod_id_fkey(full_name, email)");

    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id, role, department_id");

    const deptOverview = (departments || []).map((d) => {
      const studentCount = (allProfiles || []).filter((p) => p.department_id === d.id && p.role === "student").length;
      return {
        id: d.id,
        name: d.name,
        hod_id: d.hod_id,
        hod_name: d.profiles?.full_name || "Not assigned",
        student_count: studentCount,
        pass_rate: "0.0%",
      };
    });

    const toppers = await getTopStudentsData();

    res.json({
      departments: deptOverview,
      department_toppers: toppers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/department-toppers -> filterable toppers endpoint
router.get("/department-toppers", async (req, res) => {
  try {
    const { departmentId } = req.query;
    const toppers = await getTopStudentsData(departmentId);
    res.json(toppers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/department-stats -> full directory with live faculty/student counts
router.get("/department-stats", async (req, res) => {
  try {
    const { data: departments, error: deptError } = await supabaseAdmin
      .from("departments").select("id, name, hod_id, profiles!departments_hod_id_fkey(full_name, email)");
    if (deptError) throw deptError;

    const { data: allProfiles } = await supabaseAdmin
      .from("profiles").select("id, role, department_id");

    const { data: publicInfo } = await supabaseAdmin
      .from("department_public_info").select("department_id, student_count, placement_percentage, highest_package, average_package");

    const stats = (departments || []).map((d) => {
      const staff = (allProfiles || []).filter((p) => p.department_id === d.id && (p.role === "faculty" || p.role === "hod"));
      const students = (allProfiles || []).filter((p) => p.department_id === d.id && p.role === "student");
      const info = (publicInfo || []).find((pi) => pi.department_id === d.id);

      return {
        id: d.id,
        name: d.name,
        hod_name: d.profiles?.full_name || "Not assigned",
        hod_email: d.profiles?.email || null,
        teacher_count: staff.length,
        student_count: students.length,
        placement_percentage: info?.placement_percentage ?? null,
        highest_package: info?.highest_package ?? null,
        average_package: info?.average_package ?? null,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/examination-overview -> live Main Exams from Exam Dept
router.get("/examination-overview", async (req, res) => {
  try {
    const { data: mainExams } = await supabaseAdmin
      .from("exams")
      .select("id, title, status, created_at, subjects(name, department_id, departments(name))")
      .eq("type", "main")
      .order("created_at", { ascending: false });

    const examsList = (mainExams || []).map((e) => ({
      title: e.title,
      dept: e.subjects?.departments?.name || "All Departments",
      date: new Date(e.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: e.status === "published" ? "Published" : e.status === "evaluation" ? "In Evaluation" : "Scheduled",
      students: 0,
      evaluator: "Examination Dept",
    }));

    res.json({
      scheduledCount: examsList.length,
      appearingStudents: 0,
      publishedCount: examsList.filter((e) => e.status === 'Published').length,
      exams: examsList,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/analytics -> overall performance indicators across all departments
router.get("/analytics", async (req, res) => {
  try {
    const { data: departments } = await supabaseAdmin.from("departments").select("id, name");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, role, department_id");
    const totalStudents = (profiles || []).filter(p => p.role === 'student').length;

    const { data: mainResults } = await supabaseAdmin.from("main_results").select("total_marks, max_marks, passed");
    const { data: complaints } = await supabaseAdmin.from("complaints").select("id, status");

    let overallPassRate = "0.0%";
    let averageCgpa = "0.0 / 10.0";
    if (mainResults && mainResults.length > 0) {
      const passedCount = mainResults.filter((r) => r.passed).length;
      const passPct = Math.round((passedCount / mainResults.length) * 1000) / 10;
      overallPassRate = `${passPct}%`;

      const totalPctSum = mainResults.reduce((sum, r) => sum + (r.total_marks / (r.max_marks || 100)) * 100, 0);
      const avgPct = totalPctSum / mainResults.length;
      averageCgpa = `${(avgPct / 10).toFixed(1)} / 10.0`;
    }

    let grievanceRate = "N/A";
    if (complaints && complaints.length > 0) {
      const resolvedCount = complaints.filter((c) => c.status === "resolved" || c.status === "rejected").length;
      grievanceRate = `${Math.round((resolvedCount / complaints.length) * 100)}%`;
    }

    const colors = ["#3b82f6", "#10b981", "#06b6d4", "#ec4899", "#8b5cf6", "#f59e0b", "#ef4444", "#38bdf8"];

    const branchTrends = (departments || []).map((d, i) => {
      const studentCount = (profiles || []).filter(p => p.department_id === d.id && p.role === 'student').length;
      return {
        branch: d.name,
        rate: studentCount,
        color: colors[i % colors.length],
      };
    });

    res.json({
      overallPassRate,
      averageCgpa,
      internalCompletion: totalStudents > 0 ? "100%" : "0%",
      grievanceResolutionRate: grievanceRate,
      totalStudents,
      branchTrends,
      cgpaDistribution: [
        { label: 'Outstanding Performance (≥ 9.0 CGPA)', count: `${mainResults?.filter(r => (r.total_marks / r.max_marks) >= 0.9).length || 0} Students`, color: '#f59e0b' },
        { label: 'First Class Distinction (8.0 - 9.0 CGPA)', count: `${mainResults?.filter(r => (r.total_marks / r.max_marks) >= 0.8 && (r.total_marks / r.max_marks) < 0.9).length || 0} Students`, color: '#34d399' },
        { label: 'First Class (7.0 - 8.0 CGPA)', count: `${mainResults?.filter(r => (r.total_marks / r.max_marks) >= 0.7 && (r.total_marks / r.max_marks) < 0.8).length || 0} Students`, color: '#38bdf8' },
        { label: 'Pass / Re-appear (< 7.0 CGPA)', count: `${mainResults?.filter(r => (r.total_marks / r.max_marks) < 0.7).length || 0} Students`, color: '#f87171' },
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/principal/comparison -> side by side department indicators across all departments
router.get("/comparison", async (req, res) => {
  try {
    const { data: departments } = await supabaseAdmin.from("departments").select("id, name");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, role, department_id");
    const { data: publicInfo } = await supabaseAdmin.from("department_public_info").select("*");

    const colors = ["#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

    const compData = await Promise.all((departments || []).map(async (d, i) => {
      const studentCount = (profiles || []).filter(p => p.department_id === d.id && p.role === 'student').length;
      const info = (publicInfo || []).find((pi) => pi.department_id === d.id);

      // Fetch subjects for this dept
      const { data: subs } = await supabaseAdmin.from("subjects").select("id").eq("department_id", d.id);
      const subIds = (subs || []).map((s) => s.id);

      let passRate = "N/A";
      let backlogs = 0;
      let avgCgpa = "N/A";

      if (subIds.length > 0) {
        const { data: exams } = await supabaseAdmin.from("exams").select("id").in("subject_id", subIds);
        const examIds = (exams || []).map((e) => e.id);
        if (examIds.length > 0) {
          const { data: resList } = await supabaseAdmin.from("main_results").select("total_marks, max_marks, passed").in("exam_id", examIds);
          if (resList && resList.length > 0) {
            const passedCount = resList.filter((r) => r.passed).length;
            backlogs = resList.length - passedCount;
            passRate = `${Math.round((passedCount / resList.length) * 100)}%`;
            const avgPct = resList.reduce((sum, r) => sum + (r.total_marks / (r.max_marks || 100)) * 100, 0) / resList.length;
            avgCgpa = (avgPct / 10).toFixed(1);
          }
        }
      }

      return {
        department: d.name,
        passRate,
        backlogs,
        placement: info?.placement_percentage ? `${info.placement_percentage}%` : "N/A",
        avgCgpa,
        color: colors[i % colors.length]
      };
    }));

    res.json(compData);
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

// POST /api/principal/broadcast  body: { audience: 'hods'|'all_staff'|'individual', recipientId?, subject, body }
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

    res.status(201).json({ status: "sent", recipient_count: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/principal/college-info  body: { section, content }
router.put("/college-info", async (req, res) => {
  try {
    const { section, content } = req.body;
    if (!section || content === undefined) {
      return res.status(400).json({ error: "section and content are required" });
    }

    const { data, error } = await supabaseAdmin
      .from("college_info")
      .upsert(
        { section, content, updated_at: new Date().toISOString() },
        { onConflict: "section" }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
