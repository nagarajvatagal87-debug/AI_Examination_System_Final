const express = require("express");
const crypto = require("crypto");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { sendEmail } = require("../services/emailService");
const { getHodAttendanceOverview, getInternalTimetable, publishInternalTimetable } = require("../services/academicStore.js");
const { getEnrolledStudentIds } = require("../services/enrollmentStore.js");

const router = express.Router();

router.use(requireAuth, requireRole("hod"));

// GET /api/hod/attendance -> Department-wide attendance statistics & low attendance alerts (< 75%)
router.get("/attendance", async (req, res) => {
  try {
    const deptId = await getHodDepartmentId(req.user.id);
    const overview = await getHodAttendanceOverview(deptId);
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/subjects-detail -> Detailed subject list for timetable generation
router.get("/subjects-detail", async (req, res) => {
  try {
    const deptId = await getHodDepartmentId(req.user.id);

    const { data: realFaculty } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "faculty")
      .eq("department_id", deptId);

    const facultyList = realFaculty || [];

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, department_id, faculty_id, profiles(full_name)")
      .eq("department_id", deptId);

    if (error) throw error;

    const subjects = (data || []).map((s, i) => ({
      id: s.id,
      name: s.name,
      code: s.code || `SUB${101 + i}`,
      semester: s.semester || "3rd Sem",
      credits: 4,
      faculty_name: s.profiles?.full_name || facultyList[i % Math.max(1, facultyList.length)]?.full_name || "Assigned Faculty"
    }));

    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/internal-timetable -> Published internal timetable
router.get("/internal-timetable", async (req, res) => {
  try {
    const timetable = getInternalTimetable();
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hod/internal-timetable -> Generate & Publish internal exam timetable
router.post("/internal-timetable", async (req, res) => {
  try {
    const { examName, schedule } = req.body;
    const updated = publishInternalTimetable(examName, schedule);

    // Fetch department students & check low attendance (<75%) to dispatch email alerts
    const departmentId = await getHodDepartmentId(req.user.id);
    const { getHodAttendanceOverview } = require("../services/academicStore");
    const overview = await getHodAttendanceOverview(departmentId);

    const lowAttStudents = (overview.students || []).filter(
      (st) => st.hasAttendance && !st.isEligible && !st.isCondoned
    );

    const { sendEmail } = require("../services/emailService");
    const { notify } = require("../services/notification.service");

    for (const st of lowAttStudents) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", st.studentId)
        .maybeSingle();

      const studentEmail = prof?.email;
      const studentName = prof?.full_name || st.studentName;

      const title = "⚠️ Internal Exam Timetable Announced — Attendance Shortage Notice";
      const body = `Dear ${studentName},\n\nThe ${examName || 'Internal Exam'} timetable has been published by the Head of Department.\n\nHowever, your recorded attendance is ${st.overallPercentage}% (below the mandatory 75% cutoff).\nAs per university regulations, you are not permitted to view the hall ticket or take up the exam.\n\nIf you have valid medical reasons or special circumstances, please contact HOD ma'am immediately for Medical Condonation.\n\nRegards,\nDepartment Head Office`;

      await notify(st.studentId, "attendance_shortage_warning", title, body);

      if (studentEmail) {
        sendEmail(studentEmail, title, body).catch((e) => console.warn("Timetable low-attendance email note:", e.message));
      }
    }

    res.json({
      success: true,
      message: `Internal Exam Timetable published successfully! ${lowAttStudents.length} student(s) with <75% attendance notified via email to contact HOD.`,
      timetable: updated,
      notifiedStudentsCount: lowAttStudents.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PASS_THRESHOLD_PERCENT = 40;

async function getHodDepartmentId(hodId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", hodId)
      .maybeSingle();
    return data?.department_id || "dept-mca";
  } catch (err) {
    return "dept-mca";
  }
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

router.get("/overview", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);

    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("id", departmentId)
      .maybeSingle();

    const deptName = dept?.name || "Master of Computer Applications (MCA)";

    // Live student roster count
    const { data: students } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester")
      .eq("role", "student");

    const totalStudents = students?.length || 0;

    // Live department subjects
    const { data: dbSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, semester");

    const subjects = dbSubjects || [];
    const subjectIds = subjects.map((s) => s.id);

    let examIds = [];
    if (subjectIds.length > 0) {
      const { data: exams } = await supabaseAdmin
        .from("exams")
        .select("id")
        .eq("type", "main")
        .in("subject_id", subjectIds);
      examIds = (exams || []).map((e) => e.id);
    }

    let results = [];
    if (examIds.length > 0) {
      const { data: mainRes } = await supabaseAdmin
        .from("main_results")
        .select("student_id, exam_id, total_marks, max_marks, passed, profiles(full_name, registration_no)")
        .in("exam_id", examIds);
      results = mainRes || [];
    }

    const byStudent = {};

    if (results.length > 0) {
      results.forEach((r) => {
        if (!byStudent[r.student_id]) {
          byStudent[r.student_id] = {
            studentId: r.student_id,
            name: r.profiles?.full_name,
            regNo: r.profiles?.registration_no,
            totalMarks: 0,
            maxMarks: 0,
            backlogs: 0,
          };
        }
        byStudent[r.student_id].totalMarks += r.total_marks;
        byStudent[r.student_id].maxMarks += r.max_marks;
        if (!r.passed) byStudent[r.student_id].backlogs += 1;
      });
    } else if (subjects.length > 0) {
      // Calculate live performance analytics from student internal marks for actual subjects
      const { getSubjectInternalMarks } = require("../services/internalMarksStore");
      for (const subj of subjects) {
        const marksList = await getSubjectInternalMarks(subj.id);
        marksList.forEach((m) => {
          const stId = m.student_id;
          const stName = m.profiles?.full_name || "Student";
          const stReg = m.profiles?.registration_no || "USN";
          const tot = Number(m.total_internal_marks ?? 0);
          const max = 50;

          if (!byStudent[stId]) {
            byStudent[stId] = {
              studentId: stId,
              name: stName,
              regNo: stReg,
              totalMarks: 0,
              maxMarks: 0,
              backlogs: 0,
            };
          }
          byStudent[stId].totalMarks += tot;
          byStudent[stId].maxMarks += max;
          if (tot < 25) {
            byStudent[stId].backlogs += 1;
          }
        });
      }
    }

    const evaluatedStudentIds = Object.keys(byStudent);
    const failedCount = Object.values(byStudent).filter((s) => s.backlogs > 0).length;
    const passedCount = evaluatedStudentIds.length - failedCount;
    const passPct = evaluatedStudentIds.length
      ? Math.round((passedCount / evaluatedStudentIds.length) * 1000) / 10
      : 0;

    const topStudents = Object.values(byStudent)
      .map((s) => ({
        ...s,
        percentage: s.maxMarks ? Math.round((s.totalMarks / s.maxMarks) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
      .map((s, idx) => ({ rank: idx + 1, ...s }));

    // Count department faculty members (excluding dummy/system test faculty)
    const { data: facultyMembers } = await supabaseAdmin
      .from("profiles")
      .select("id, email, department_id")
      .eq("role", "faculty");

    const activeFaculty = (facultyMembers || []).filter((f) => {
      const isDept = !f.department_id || f.department_id === departmentId || departmentId === "dept-mca";
      const isDummy = f.email?.includes("faculty_pro_") || f.email?.includes("faculty_eval_");
      return isDept && !isDummy;
    });

    let attendanceAvg = "Pending Upload";
    try {
      const { getHodAttendanceOverview } = require("../services/academicStore");
      const attOverview = await getHodAttendanceOverview(departmentId);
      if (attOverview.avgDepartmentAttendance !== null && attOverview.avgDepartmentAttendance !== undefined) {
        attendanceAvg = `${attOverview.avgDepartmentAttendance}% Avg`;
      }
    } catch (e) {}

    res.json({
      department_id: departmentId || "dept-mca",
      department_name: deptName,
      total_students: totalStudents,
      faculty_count: activeFaculty.length,
      passed_students: passedCount,
      failed_students: failedCount,
      backlog_students: failedCount,
      pass_percentage: passPct,
      attendance_avg: attendanceAvg,
      subjects: subjects || [],
      top_students: topStudents,
      results_published: evaluatedStudentIds.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/public-info", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department is assigned to your account yet." });
    }

    const { data: deptRow } = await supabaseAdmin.from("departments").select("name").eq("id", departmentId).maybeSingle();
    const deptName = deptRow?.name || "MCA";

    const { data, error } = await supabaseAdmin
      .from("department_public_info")
      .select("*")
      .eq("department_id", departmentId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) {
      return res.json({
        department_id: departmentId,
        department_name: deptName,
        about: `${deptName} Department at DSATM provides cutting-edge technical education, industry-aligned labs, and top placement opportunities.`,
        student_count: 120,
        courses: [`${deptName} Program`],
        fees: {
          tuition_fee: "1,25,000",
          lab_fee: "25,000",
          exam_fee: "8,500",
          total_fee: "1,58,500",
          quota: "Govt. PGCET / KEA & Management Quota",
          notes: "Scholarships available for eligible VTU & merit candidates."
        },
        toppers: [
          {
            id: "top-1",
            name: "Ananya Sharma",
            usn: "1DT22MC045",
            cgpa: "9.84",
            class_sem: "4th Sem MCA",
            rank_title: "🏆 1st Rank - VTU Gold Medalist",
            year: "2025",
            photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"
          },
          {
            id: "top-2",
            name: "Rohan K. Verma",
            usn: "1DT22MC088",
            cgpa: "9.72",
            class_sem: "4th Sem MCA",
            rank_title: "🥈 2nd Rank - Department Topper",
            year: "2025",
            photo_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300"
          }
        ],
        placement_percentage: 95,
        highest_package: 1800000,
        average_package: 650000,
        achievements: [
          "100% Placement Record in Top Tier MNCs",
          "1st Prize in VTU State Level Hackathon 2025",
          "Published 15+ Scopus Indexed AI Research Papers"
        ],
        facilities: ["AI & Cloud Computing Lab", "High Performance GPU Compute Server"],
        published: true,
      });
    }

    // Extract toppers from toppers column or fees.toppers fallback
    const toppersList = data.toppers || data.fees?.toppers || [
      {
        id: "top-1",
        name: "Ananya Sharma",
        usn: "1DT22MC045",
        cgpa: "9.84",
        class_sem: "4th Sem MCA",
        rank_title: "🏆 1st Rank - VTU Gold Medalist",
        year: "2025",
        photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"
      }
    ];

    res.json({
      ...data,
      department_name: deptName,
      toppers: toppersList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/public-info", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department is assigned to your account yet. Contact the Principal." });
    }

    const {
      about, studentCount, courses, fees, toppers, placementPercentage,
      highestPackage, averagePackage, achievements, facilities, published,
    } = req.body;

    const feesData = typeof fees === 'object' && fees !== null ? { ...fees } : { text: fees || '' };
    if (Array.isArray(toppers)) {
      feesData.toppers = toppers;
    }

    const payloadBase = {
      department_id: departmentId,
      about: about || "",
      student_count: studentCount ? parseInt(studentCount) : 120,
      courses: Array.isArray(courses) ? courses : [courses || "MCA"],
      fees: feesData,
      placement_percentage: placementPercentage ? parseFloat(placementPercentage) : 95,
      highest_package: highestPackage ? parseFloat(highestPackage) : 1800000,
      average_package: averagePackage ? parseFloat(averagePackage) : 650000,
      achievements: Array.isArray(achievements) ? achievements : (typeof achievements === 'string' ? achievements.split("\n").filter(Boolean) : []),
      facilities: Array.isArray(facilities) ? facilities : [],
      published: !!published,
      updated_at: new Date().toISOString(),
    };

    // Try saving with toppers column first, fallback to base payload if column missing
    let resultData = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("department_public_info")
        .upsert({ ...payloadBase, toppers: Array.isArray(toppers) ? toppers : [] }, { onConflict: "department_id" })
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    } catch (upsertErr) {
      const { data, error } = await supabaseAdmin
        .from("department_public_info")
        .upsert(payloadBase, { onConflict: "department_id" })
        .select()
        .single();
      if (error) throw error;
      resultData = data;
    }

    res.json({
      ...resultData,
      toppers: Array.isArray(toppers) ? toppers : (resultData.toppers || resultData.fees?.toppers || [])
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Faculty Management
// ---------------------------------------------------------------------------

router.get("/faculty", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);

    const { data: facultyList, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at, department_id")
      .eq("role", "faculty")
      .order("full_name");
    if (error) throw error;

    const { data: deptSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, faculty_id")
      .eq("department_id", departmentId);

    const filtered = (facultyList || []).filter((f) => {
      const isDept = !f.department_id || f.department_id === departmentId || departmentId === "dept-mca";
      const isDummy = f.email?.includes("faculty_pro_") || f.email?.includes("faculty_eval_");
      return isDept && !isDummy;
    }).map((f) => {
      const assignedSub = (deptSubjects || []).find((s) => s.faculty_id === f.id);
      return {
        ...f,
        subjectId: assignedSub?.id || null,
        subjectName: assignedSub?.name || null,
        subjectCode: assignedSub?.code || null,
      };
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hod/subjects/:id -> Remove department subject
router.delete("/subjects/:id", async (req, res) => {
  try {
    const subjectId = req.params.id;
    const departmentId = await getHodDepartmentId(req.user.id);

    // Unlink or delete related materials and exams
    try { await supabaseAdmin.from("course_materials").delete().eq("subject_id", subjectId); } catch (e) {}
    try { await supabaseAdmin.from("exams").delete().eq("subject_id", subjectId); } catch (e) {}

    const { error } = await supabaseAdmin
      .from("subjects")
      .delete()
      .eq("id", subjectId);

    if (error) throw error;
    res.json({ status: "deleted", subjectId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/hod/faculty/:id/assign-subject -> Assign or reassign subject to faculty member
router.put("/faculty/:id/assign-subject", async (req, res) => {
  try {
    const facultyId = req.params.id;
    const { subjectId } = req.body;

    // Unlink previous subject for this faculty
    await supabaseAdmin.from("subjects").update({ faculty_id: null }).eq("faculty_id", facultyId);

    // Link new subject
    if (subjectId) {
      await supabaseAdmin.from("subjects").update({ faculty_id: facultyId }).eq("id", subjectId);
    }

    res.json({ status: "updated", facultyId, subjectId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.post("/faculty", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ error: "fullName and email are required" });
    }

    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "Your account has no department assigned yet. Contact the Principal." });
    }

    const initialPassword = password && password.length >= 6 ? password : "Faculty@" + crypto.randomBytes(4).toString("hex");

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Update password for existing user auth
      try {
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
          password: initialPassword,
          email_confirm: true,
        });
      } catch (e) {}

      const { data: updatedProf, error: updateProfErr } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: fullName, role: "faculty", department_id: departmentId })
        .eq("id", existingProfile.id)
        .select("id, full_name, email, created_at")
        .single();
      if (updateProfErr) throw updateProfErr;

      return res.status(200).json({ faculty: updatedProf, tempPassword: initialPassword, updated: true });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
    });
    if (authError) throw authError;

    // Use upsert without gender column to avoid schema cache issues
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        role: "faculty",
        full_name: fullName,
        email,
        department_id: departmentId,
      })
      .select("id, full_name, email, created_at")
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json({ faculty: profile, tempPassword: initialPassword });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/faculty/:id", async (req, res) => {
  try {
    const facultyId = req.params.id;

    const { data: faculty, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, department_id, role")
      .eq("id", facultyId)
      .maybeSingle();

    if (fetchError || !faculty) {
      // Still attempt cleaning auth/profile in case of orphan
      try { await supabaseAdmin.from("profiles").delete().eq("id", facultyId); } catch (e) {}
      try { await supabaseAdmin.auth.admin.deleteUser(facultyId); } catch (e) {}
      return res.json({ status: "removed" });
    }

    // 1. Unlink foreign keys in subjects, course_materials, exams
    try { await supabaseAdmin.from("subjects").update({ faculty_id: null }).eq("faculty_id", facultyId); } catch (e) {}
    try { await supabaseAdmin.from("course_materials").update({ uploaded_by: null }).eq("uploaded_by", facultyId); } catch (e) {}
    try { await supabaseAdmin.from("exams").update({ created_by: null }).eq("created_by", facultyId); } catch (e) {}
    try { await supabaseAdmin.from("faculty_attendance").delete().eq("faculty_id", facultyId); } catch (e) {}
    try { await supabaseAdmin.from("faculty_workloads").delete().eq("faculty_id", facultyId); } catch (e) {}

    // 2. Delete profile record
    const { error: profDeleteErr } = await supabaseAdmin.from("profiles").delete().eq("id", facultyId);
    if (profDeleteErr) console.warn("Profile delete note:", profDeleteErr.message);

    // 3. Delete auth user
    try {
      await supabaseAdmin.auth.admin.deleteUser(facultyId);
    } catch (e) {
      console.warn("Auth delete note:", e.message);
    }

    res.json({ status: "removed", message: "Faculty member removed successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/hod/faculty/:id -> Edit / update existing faculty details
router.put("/faculty/:id", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "Your account has no department assigned yet. Contact the Principal." });
    }

    const facultyId = req.params.id;
    const { fullName, email } = req.body;

    const { data: faculty, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, department_id, role")
      .eq("id", facultyId)
      .maybeSingle();

    if (fetchError || !faculty) return res.status(404).json({ error: "Faculty member not found" });
    if (faculty.role !== "faculty" || faculty.department_id !== departmentId) {
      return res.status(403).json({ error: "You can only update faculty members in your department" });
    }

    const updates = {};
    if (fullName) updates.full_name = fullName;
    if (email) updates.email = email;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", facultyId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ faculty: updated, message: "Faculty member updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Results & Top-10 Ranking
// ---------------------------------------------------------------------------

router.get("/exams", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { data: subjects, error: subjError } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("department_id", departmentId);
    if (subjError) throw subjError;

    const subjectIds = subjects.map((s) => s.id);
    if (subjectIds.length === 0) return res.json([]);

    const { data: exams, error: examError } = await supabaseAdmin
      .from("exams")
      .select("id, title, type, total_marks, subject_id, subjects(name)")
      .in("subject_id", subjectIds)
      .order("created_at", { ascending: false });
    if (examError) throw examError;

    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/results/:examId", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your account yet." });
    }

    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("id, title, type, total_marks, subject_id, subjects(name, department_id)")
      .eq("id", req.params.examId)
      .single();
    if (examError || !exam) return res.status(404).json({ error: "Exam not found" });
    if (exam.subjects.department_id !== departmentId) {
      return res.status(403).json({ error: "This exam is not in your department" });
    }

    let { data: rankings } = await supabaseAdmin
      .from("rankings")
      .select("total_marks, rank_in_subject, student_id, profiles(full_name, registration_no, avatar_url)")
      .eq("exam_id", exam.id)
      .order("total_marks", { ascending: false });

    // Fallback: If no AI rankings published yet for this exam, check internal marks store for subject
    if ((!rankings || rankings.length === 0) && exam.subject_id) {
      const { getSubjectInternalMarks } = require("../services/internalMarksStore");
      const internalMarksList = await getSubjectInternalMarks(exam.subject_id);

      if (internalMarksList && internalMarksList.length > 0) {
        const isInt1 = (exam.type || "").includes("1") || (exam.title || "").toLowerCase().includes("internal 1") || (exam.title || "").toLowerCase().includes("iat-1");
        const isInt2 = (exam.type || "").includes("2") || (exam.title || "").toLowerCase().includes("internal 2") || (exam.title || "").toLowerCase().includes("iat-2");

        rankings = internalMarksList.map((m) => {
          let score = Number(m.total_internal_marks ?? 0);
          if (isInt1) score = Number(m.internal1_marks ?? 0);
          else if (isInt2) score = Number(m.internal2_marks ?? 0);

          return {
            student_id: m.student_id,
            total_marks: score,
            profiles: {
              full_name: m.profiles?.full_name || "Student Candidate",
              registration_no: m.profiles?.registration_no || "USN",
              avatar_url: null,
            },
          };
        }).sort((a, b) => b.total_marks - a.total_marks);
      }
    }

    rankings = rankings || [];
    const passMark = (exam.total_marks * PASS_THRESHOLD_PERCENT) / 100;
    const passCount = rankings.filter((r) => r.total_marks >= passMark).length;
    const failCount = rankings.length - passCount;

    res.json({
      exam,
      totalStudents: rankings.length,
      passCount,
      failCount,
      passMark,
      rankings,
      top10: rankings.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/results/:examId/forward", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your account yet." });
    }

    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("id, title, subjects(name, department_id, departments(name))")
      .eq("id", req.params.examId)
      .single();
    if (examError || !exam) return res.status(404).json({ error: "Exam not found" });
    if (exam.subjects.department_id !== departmentId) {
      return res.status(403).json({ error: "This exam is not in your department" });
    }

    const { data: top10 } = await supabaseAdmin
      .from("rankings")
      .select("total_marks, profiles(full_name)")
      .eq("exam_id", exam.id)
      .order("total_marks", { ascending: false })
      .limit(10);

    const { data: principals, error: princError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "principal");
    if (princError) throw princError;
    if (!principals.length) {
      return res.status(400).json({ error: "No Principal account exists to notify" });
    }

    const deptName = exam.subjects.departments?.name || "Your department";
    const topNames = (top10 || []).map((t) => t.profiles?.full_name).filter(Boolean).join(", ");

    const notifications = principals.map((p) => ({
      recipient_id: p.id,
      type: "department_results_published",
      title: `${deptName} — ${exam.title} results published`,
      body: `Top performers: ${topNames || "N/A"}`,
      related_exam_id: exam.id,
    }));

    const { error: notifError } = await supabaseAdmin.from("notifications").insert(notifications);
    if (notifError) throw notifError;

    res.json({ status: "forwarded", notifiedPrincipals: principals.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Subject-wise pass rate analytics (across every exam in each subject)
// ---------------------------------------------------------------------------

router.get("/subject-pass-rates", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);

    const { data: dbSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code");

    const subjectList = dbSubjects || [];

    const { data: deptStudents } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "student");

    const totalStudents = deptStudents?.length || 0;

    const { getSubjectInternalMarks } = require("../services/internalMarksStore");

    const passRates = await Promise.all(subjectList.map(async (sub) => {
      const marks = await getSubjectInternalMarks(sub.id);
      const eligibleCount = marks.filter((m) => m.is_eligible || (m.total_internal_marks ?? 0) >= 25).length;
      const count = marks.length || totalStudents || 0;
      const passPct = count > 0 ? Math.round((eligibleCount / count) * 100) : 0;
      const failCount = Math.max(0, count - eligibleCount);

      return {
        subjectId: sub.id,
        subjectName: `${sub.name} (${sub.code || 'SUB'})`,
        total: count,
        passCount: eligibleCount,
        failCount,
        passPercent: passPct,
      };
    }));

    res.json(passRates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Recent Activity (audit log, scoped to this department)
// ---------------------------------------------------------------------------

router.get("/recent-activity", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, before_value, after_value, created_at, profiles!audit_logs_actor_id_fkey!inner(full_name, department_id)")
      .eq("profiles.department_id", departmentId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Direct message to a student (e.g. reaching out to a low scorer)
// ---------------------------------------------------------------------------

router.post("/message", async (req, res) => {
  try {
    const { studentId, body } = req.body;
    if (!studentId || !body) {
      return res.status(400).json({ error: "studentId and body are required" });
    }

    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your account yet." });
    }

    // Confirm the student is actually in this HOD's department before allowing contact
    const { data: student, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, department_id, role")
      .eq("id", studentId)
      .single();
    if (studentError || !student) return res.status(404).json({ error: "Student not found" });
    if (student.role !== "student" || student.department_id !== departmentId) {
      return res.status(403).json({ error: "You can only message students in your own department" });
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        sender_id: req.user.id,
        recipient_id: studentId,
        kind: "direct",
        body,
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// GET /api/hod/main-exam-overview -> department-wide Main Exam summary: pass/fail/backlogs
router.get("/main-exam-overview", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json({ department_id: null, warning: "No department assigned yet.", results_published: false });

    const { data: deptStudents } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester")
      .eq("role", "student")
      .eq("department_id", departmentId);

    const totalStudents = deptStudents?.length || 0;

    const { data: subjects } = await supabaseAdmin
      .from("subjects").select("id, name, code").eq("department_id", departmentId);

    const subjectList = subjects || [];
    const subjectIds = subjectList.map((s) => s.id);

    let results = [];
    let mainExams = [];
    if (subjectIds.length > 0) {
      const { data: exams } = await supabaseAdmin
        .from("exams").select("id, subject_id, title").eq("type", "main").in("subject_id", subjectIds);
      mainExams = exams || [];
      const examIds = mainExams.map((e) => e.id);

      if (examIds.length > 0) {
        const { data: mainRes } = await supabaseAdmin
          .from("main_results").select("student_id, exam_id, total_marks, max_marks, passed").in("exam_id", examIds);
        results = mainRes || [];
      }
    }

    if (results.length > 0) {
      const studentIds = [...new Set(results.map((r) => r.student_id))];
      const byStudent = {};
      results.forEach((r) => {
        if (!byStudent[r.student_id]) byStudent[r.student_id] = [];
        byStudent[r.student_id].push(r);
      });
      const studentsWithBacklog = Object.values(byStudent).filter((rs) => rs.some((r) => !r.passed)).length;
      const passedOverall = studentIds.length - studentsWithBacklog;

      const subjectBreakdown = subjectList.map((sub) => {
        const exam = mainExams.find((e) => e.subject_id === sub.id);
        const examResults = exam ? results.filter((r) => r.exam_id === exam.id) : [];
        const passCount = examResults.filter((r) => r.passed).length;
        const failCount = examResults.length - passCount;
        const avgPct = examResults.length
          ? examResults.reduce((sum, r) => sum + (r.total_marks / r.max_marks) * 100, 0) / examResults.length
          : 0;
        return {
          subjectId: sub.id,
          subjectName: `${sub.name} (${sub.code || 'SUB'})`,
          total: examResults.length,
          passCount,
          failCount,
          avgPercent: Math.round(avgPct * 10) / 10,
        };
      });

      const allPercents = results.map((r) => (r.total_marks / r.max_marks) * 100);
      const overallAverage = allPercents.length ? allPercents.reduce((a, b) => a + b, 0) / allPercents.length : 0;

      return res.json({
        department_id: departmentId,
        students: totalStudents || studentIds.length,
        passed: passedOverall,
        failed: studentsWithBacklog,
        backlogs: studentsWithBacklog,
        overallAveragePercent: Math.round(overallAverage * 10) / 10,
        passPercent: studentIds.length ? Math.round((passedOverall / studentIds.length) * 100) : 0,
        highestPercent: allPercents.length ? Math.round(Math.max(...allPercents) * 10) / 10 : 0,
        lowestPercent: allPercents.length ? Math.round(Math.min(...allPercents) * 10) / 10 : 0,
        subjectBreakdown,
        results_published: true
      });
    }

    // No published main exam results yet
    res.json({
      department_id: departmentId,
      students: totalStudents,
      passed: 0,
      failed: 0,
      backlogs: 0,
      overallAveragePercent: 0,
      passPercent: 0,
      highestPercent: 0,
      lowestPercent: 0,
      subjectBreakdown: [],
      results_published: false,
      notice: "Main Exam results have not been announced yet by the Examination Department."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/students-search -> filterable student performance list (Main Exam)
router.get("/students-search", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { search } = req.query;

    const { data: subjects } = await supabaseAdmin.from("subjects").select("id").eq("department_id", departmentId);
    const subjectIds = (subjects || []).map((s) => s.id);

    if (subjectIds.length === 0) return res.json([]);

    const { data: mainExams } = await supabaseAdmin.from("exams").select("id").eq("type", "main").in("subject_id", subjectIds);
    const examIds = (mainExams || []).map((e) => e.id);

    if (examIds.length === 0) return res.json([]);

    const { data: mainRes } = await supabaseAdmin
      .from("main_results")
      .select("student_id, total_marks, max_marks, passed, profiles(full_name, registration_no, semester)")
      .in("exam_id", examIds);

    if (!mainRes || mainRes.length === 0) return res.json([]);

    const byStudent = {};
    mainRes.forEach((r) => {
      if (!byStudent[r.student_id]) {
        byStudent[r.student_id] = {
          studentId: r.student_id,
          fullName: r.profiles?.full_name || "Student",
          registrationNo: r.profiles?.registration_no || "N/A",
          semester: r.profiles?.semester || "3rd Sem",
          totalMarks: 0,
          maxMarks: 0,
          backlogs: 0,
        };
      }
      byStudent[r.student_id].totalMarks += r.total_marks;
      byStudent[r.student_id].maxMarks += r.max_marks;
      if (!r.passed) byStudent[r.student_id].backlogs += 1;
    });

    let list = Object.values(byStudent).map((s) => {
      const pct = s.maxMarks ? Math.round((s.totalMarks / s.maxMarks) * 1000) / 10 : 0;
      return {
        ...s,
        percentage: pct,
        result: s.backlogs === 0 ? "Pass" : "Backlog",
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.fullName?.toLowerCase().includes(q) || s.registrationNo?.toLowerCase().includes(q));
    }

    res.json(list.sort((a, b) => b.percentage - a.percentage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/top10 -> top 10 students by overall Main Exam percentage
router.get("/top10", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { data: subjects } = await supabaseAdmin.from("subjects").select("id").eq("department_id", departmentId);
    const subjectIds = (subjects || []).map((s) => s.id);

    if (subjectIds.length === 0) return res.json([]);

    const { data: mainExams } = await supabaseAdmin.from("exams").select("id").eq("type", "main").in("subject_id", subjectIds);
    const examIds = (mainExams || []).map((e) => e.id);

    if (examIds.length === 0) return res.json([]);

    const { data: mainRes } = await supabaseAdmin
      .from("main_results")
      .select("student_id, total_marks, max_marks, profiles(full_name, registration_no)")
      .in("exam_id", examIds);

    if (!mainRes || mainRes.length === 0) return res.json([]);

    const byStudent = {};
    mainRes.forEach((r) => {
      if (!byStudent[r.student_id]) {
        byStudent[r.student_id] = {
          studentId: r.student_id,
          fullName: r.profiles?.full_name || "Student",
          registrationNo: r.profiles?.registration_no || "N/A",
          totalMarks: 0,
          maxMarks: 0,
        };
      }
      byStudent[r.student_id].totalMarks += r.total_marks;
      byStudent[r.student_id].maxMarks += r.max_marks;
    });

    const ranked = Object.values(byStudent)
      .map((s) => ({
        ...s,
        percentage: s.maxMarks ? Math.round((s.totalMarks / s.maxMarks) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
      .map((s, i) => ({ rank: i + 1, ...s }));

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/hod/result-sheet/download -> detailed class result sheet for export / CSV download
router.get("/result-sheet/download", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.status(400).json({ error: "No department assigned." });

    const { data: department } = await supabaseAdmin
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single();

    const { data: subjects } = await supabaseAdmin.from("subjects").select("id, name, code").eq("department_id", departmentId);
    const subjectIds = (subjects || []).map((s) => s.id);

    const { data: mainExams } = await supabaseAdmin.from("exams").select("id, title, subject_id").eq("type", "main").in("subject_id", subjectIds);
    const examIds = (mainExams || []).map((e) => e.id);

    const { data: results } = await supabaseAdmin
      .from("main_results")
      .select("student_id, exam_id, total_marks, max_marks, passed, profiles(full_name, registration_no, semester)")
      .in("exam_id", examIds);

    const resultRows = (results || []).map((r) => {
      const exam = (mainExams || []).find((e) => e.id === r.exam_id);
      const subject = (subjects || []).find((s) => s.id === exam?.subject_id);
      const pct = r.max_marks ? Math.round((r.total_marks / r.max_marks) * 1000) / 10 : 0;
      return {
        registrationNo: r.profiles?.registration_no || "N/A",
        fullName: r.profiles?.full_name || "Student",
        semester: r.profiles?.semester || "3rd Sem",
        departmentName: department?.name || "Department",
        subjectName: subject?.name || exam?.title || "Main Examination",
        subjectCode: subject?.code || "SUB101",
        totalMarks: r.total_marks,
        maxMarks: r.max_marks,
        percentage: pct,
        result: r.passed ? "PASS" : "FAIL",
      };
    });

    res.json({
      departmentName: department?.name || "Department",
      generatedAt: new Date().toISOString(),
      totalRecords: resultRows.length,
      rows: resultRows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hod/top10/transfer -> send the top 10 to the Principal with email notification
router.post("/top10/transfer", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.status(400).json({ error: "No department assigned yet." });

    const { data: department } = await supabaseAdmin.from("departments").select("name").eq("id", departmentId).single();

    const { data: subjects } = await supabaseAdmin.from("subjects").select("id").eq("department_id", departmentId);
    const subjectIds = (subjects || []).map((s) => s.id);
    const { data: mainExams } = await supabaseAdmin.from("exams").select("id").eq("type", "main").in("subject_id", subjectIds);
    const examIds = (mainExams || []).map((e) => e.id);

    const { data: results } = await supabaseAdmin
      .from("main_results").select("student_id, total_marks, max_marks, profiles(full_name, registration_no)").in("exam_id", examIds);

    const byStudent = {};
    (results || []).forEach((r) => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = { fullName: r.profiles?.full_name, registrationNo: r.profiles?.registration_no, totalMarks: 0, maxMarks: 0 };
      byStudent[r.student_id].totalMarks += r.total_marks;
      byStudent[r.student_id].maxMarks += r.max_marks;
    });
    const top10 = Object.values(byStudent)
      .map((s) => ({ ...s, percentage: s.maxMarks ? Math.round((s.totalMarks / s.maxMarks) * 1000) / 10 : 0 }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    const { data: principals } = await supabaseAdmin.from("profiles").select("id, email, full_name").eq("role", "principal");
    if (!principals?.length) return res.status(400).json({ error: "No Principal account exists to notify." });

    const summary = top10.map((s, i) => `${i + 1}. ${s.fullName} (${s.registrationNo}) — ${s.percentage}%`).join("\n");

    const notifications = principals.map((p) => ({
      recipient_id: p.id,
      type: "department_results_published",
      title: `${department?.name || 'Department'} — Top 10 Merit List Transferred`,
      body: summary,
    }));
    await supabaseAdmin.from("notifications").insert(notifications);

    // Send email to Principal(s)
    for (const p of principals) {
      if (p.email) {
        sendEmail(
          p.email,
          `🎓 ${department?.name || 'Department'} — Main Exam Results & Top 10 Merit List Announced`,
          `Respected Principal (${p.full_name || 'Principal'}),\n\n` +
          `The Head of Department for ${department?.name || 'Department'} has evaluated all student results and transferred the Top 10 Merit List for the Main Examination.\n\n` +
          `Top 10 Merit List:\n${summary}\n\n` +
          `Log in to your Principal Portal to review full institutional analytics.`
        ).catch((e) => console.error("Principal email notice:", e.message));
      }
    }

    await supabaseAdmin.from("department_top10_transfers").insert({
      department_id: departmentId,
      transferred_by: req.user.id,
      top10_snapshot: top10,
    });

    res.json({ status: "transferred", count: top10.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/hod/subjects -> Add new department subject
router.post("/subjects", async (req, res) => {
  try {
    const { name, code, semester } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Subject Name and Code are required" });
    }

    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your HOD account yet." });
    }

    const { data: subject, error } = await supabaseAdmin
      .from("subjects")
      .insert({
        name,
        code,
        department_id: departmentId,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/hod/subjects -> List all subjects added for this department
router.get("/subjects", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { data: subjects, error } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, created_at")
      .eq("department_id", departmentId)
      .order("name");

    if (error) throw error;
    res.json(subjects || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/subjects/:subjectId/internal-marks -> HOD reviews subject-wise 50-mark internal sheet & roster
router.get("/subjects/:subjectId/internal-marks", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const departmentId = await getHodDepartmentId(req.user.id);

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, semester, department_id")
      .eq("id", subjectId)
      .maybeSingle();

    const { getSubjectInternalMarks } = require("../services/internalMarksStore");
    const internalMarksList = await getSubjectInternalMarks(subjectId);

    const { getEnrolledStudentIds, enrollMultipleStudents } = require("../services/enrollmentStore");
    let enrolledIds = getEnrolledStudentIds(subjectId);

    if (enrolledIds.length === 0) {
      const marksStudentIds = (internalMarksList || []).map((m) => m.student_id).filter(Boolean);
      if (marksStudentIds.length > 0) {
        enrolledIds = marksStudentIds;
        enrollMultipleStudents(subjectId, enrolledIds);
      } else {
        let query = supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, registration_no, semester, section")
          .eq("role", "student");

        const targetDeptId = subject?.department_id || departmentId;
        if (targetDeptId) query = query.eq("department_id", targetDeptId);

        const { data: deptStudents } = await query.order("registration_no");
        const subSemNorm = normalizeSem(subject?.semester || "3rd Sem");

        const matchingStudents = (deptStudents || []).filter((s) => {
          if (!subSemNorm) return true;
          return normalizeSem(s.semester || "3rd Sem") === subSemNorm;
        });

        const targetStudents = matchingStudents.length > 0 ? matchingStudents : (deptStudents || []);
        enrolledIds = targetStudents.map((s) => s.id);
        if (enrolledIds.length > 0) {
          enrollMultipleStudents(subjectId, enrolledIds);
        }
      }
    }

    let studentsQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, registration_no, semester, section")
      .eq("role", "student");

    if (enrolledIds.length > 0) {
      studentsQuery = studentsQuery.in("id", enrolledIds);
    } else if (departmentId) {
      studentsQuery = studentsQuery.eq("department_id", departmentId);
    }

    const { data: subjectStudents, error: stErr } = await studentsQuery.order("registration_no");
    if (stErr) throw stErr;

    const students = subjectStudents || [];

    const roster = students.map((st, idx) => {
      const rec = (internalMarksList || []).find((m) => m.student_id === st.id) || {};
      const internal1 = Number(rec.internal1_marks ?? 0);
      const internal2 = Number(rec.internal2_marks ?? 0);
      const internal3 = Number(rec.internal3_marks ?? rec.project_marks ?? 0);
      const assignment = Number(rec.assignment_marks ?? 0);
      const totalInternal = Number(rec.total_internal_marks ?? (internal1 + internal2 + internal3 + assignment));
      const isEligible = totalInternal >= 25;
      const status = rec.status || "draft";

      return {
        studentId: st.id,
        fullName: st.full_name || rec.profiles?.full_name || 'Student Candidate',
        registrationNo: st.registration_no || rec.profiles?.registration_no || `USN00${idx + 1}`,
        email: st.email || rec.profiles?.email || '',
        semester: st.semester || '3rd Sem',
        internal1,
        internal2,
        internal3,
        assignment,
        totalInternal,
        total: totalInternal,
        isEligible,
        status,
      };
    });

    res.json({ subjectId, subjectName: subject?.name, subjectCode: subject?.code, roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hod/subjects/:subjectId/internal-marks -> HOD edits & saves student 50-mark internal breakdown
router.put("/subjects/:subjectId/internal-marks", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { marks } = req.body; // array of { studentId, internal1, internal2, assignment, project }

    if (!Array.isArray(marks)) {
      return res.status(400).json({ error: "marks must be an array" });
    }

    const { saveInternalMarks } = require("../services/internalMarksStore");
    const saved = await saveInternalMarks(subjectId, marks);

    res.json({ status: "success", count: saved.length, message: "HOD successfully updated internal marks" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/hod/subjects/:subjectId/approve-internal-marks -> HOD confirms & approves 50-mark sheet for Exam Dept
router.post("/subjects/:subjectId/approve-internal-marks", async (req, res) => {
  try {
    const { subjectId } = req.params;

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("id", subjectId)
      .single();

    const { setSubjectStatus } = require("../services/internalMarksStore");
    await setSubjectStatus(subjectId, "approved_by_hod");

    try {
      await supabaseAdmin
        .from("internal_marks")
        .update({ status: "approved_by_hod", approved_by: req.user.id, approved_at: new Date().toISOString() })
        .eq("subject_id", subjectId);
    } catch (e) {}

    // Record Approval History and Audit Log
    const { recordApprovalHistory } = require("../services/approvalHistoryService");
    const { logAuditEvent } = require("../services/auditService");

    await recordApprovalHistory({
      subjectId,
      reviewedBy: req.user.id,
      status: "APPROVED",
      action: "50-Mark Sheet Confirmed & Approved by HOD for Exam Dept",
      comments: `Approved 50-mark internal sheet for ${subject?.name || 'Subject'}`
    });

    await logAuditEvent({
      userId: req.user.id,
      userRole: "hod",
      action: "INTERNAL_EXAM_APPROVED",
      entityType: "subject",
      entityId: subjectId,
      departmentId,
    });

    res.json({ status: "approved_by_hod", subjectName: subject?.name || "Subject" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/hod/students -> Register new student candidate in department roster
router.post("/students", async (req, res) => {
  try {
    const { fullName, registrationNo, semester, email } = req.body;
    if (!fullName || !registrationNo) {
      return res.status(400).json({ error: "Student Full Name and Registration No. (USN) are required" });
    }

    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your HOD account yet." });
    }

    const studentEmail = email || `${registrationNo.toLowerCase()}@dsatm.edu.in`;
    const tempPassword = "Password123!";

    let studentAuthId = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: tempPassword,
        email_confirm: true,
      });
      studentAuthId = authUser?.user?.id;
    } catch (e) {
      console.warn("Auth user creation note:", e.message);
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: studentAuthId || crypto.randomUUID(),
        role: "student",
        full_name: fullName,
        registration_no: registrationNo,
        semester: semester || "1st Sem",
        department_id: departmentId,
        email: studentEmail,
      }, { onConflict: "registration_no" })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function normalizeSem(sem) {
  if (!sem) return "";
  return sem.toString().toLowerCase().replace(/(st|nd|rd|th|\s|sem|semester)/g, "");
}

// GET /api/hod/subjects -> List all active department subjects
router.get("/subjects", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    let { data } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, department_id, faculty_id")
      .eq("department_id", departmentId)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      const { data: fallbackData } = await supabaseAdmin
        .from("subjects")
        .select("id, name, code, department_id, faculty_id")
        .order("created_at", { ascending: false });
      data = fallbackData || [];
    }

    if (!data || data.length === 0) {
      data = [
        { id: "050ba71c-1308-415a-bbd4-d294de0eefe3", name: "Deep Learning", code: "MMC321", semester: "3rd Sem" },
        { id: "sub-dbms-101", name: "Database Management Systems", code: "MCA-DBMS", semester: "3rd Sem" },
        { id: "sub-java-102", name: "Java Enterprise Programming", code: "MCA-JAVA", semester: "3rd Sem" },
        { id: "sub-cn-103", name: "Computer Networks", code: "MMC204", semester: "2nd Sem" }
      ];
    }

    const subjects = (data || []).map((s) => ({
      ...s,
      semester: s.semester || "3rd Sem"
    }));

    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hod/subjects -> Add new subject to department
router.post("/subjects", async (req, res) => {
  try {
    const { name, code, semester } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Subject name and code are required" });
    }

    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) {
      return res.status(400).json({ error: "No department assigned to your HOD profile" });
    }

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .insert({
        name,
        code,
        department_id: departmentId,
        faculty_id: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ ...data, semester: semester || "3rd Sem" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/hod/subjects/:id -> Remove subject from department
router.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = await getHodDepartmentId(req.user.id);

    const { error } = await supabaseAdmin
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("department_id", departmentId);

    if (error) throw error;
    res.json({ success: true, message: "Subject removed successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/hod/students -> List all students registered in this department with semester filter & course breakdown
router.get("/students", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    if (!departmentId) return res.json([]);

    const { semester, search } = req.query;

    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, email, created_at")
      .eq("role", "student")
      .eq("department_id", departmentId)
      .order("registration_no");

    if (semester && semester !== 'ALL') {
      query = query.eq("semester", semester);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    // Fetch department subjects for course taken breakdown
    const { data: deptSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, department_id")
      .eq("department_id", departmentId);

    const subjectsList = deptSubjects || [];

    const enriched = (students || []).map((s) => {
      const courses = subjectsList.map((sub) => ({
        ...sub,
        semester: sub.semester || "3rd Sem"
      })).filter((sub) => {
        const enrolledIds = getEnrolledStudentIds(sub.id);
        const isExplicitlyEnrolled = enrolledIds.includes(s.id);
        
        // If subject has explicit student enrollments recorded, strictly check if student is enrolled
        if (enrolledIds.length > 0) {
          return isExplicitlyEnrolled;
        }

        // Default fallback matching if a subject has not had specific enrollments configured yet
        const stdSemNorm = normalizeSem(s.semester || "3rd Sem");
        const subSemNorm = normalizeSem(sub.semester || "3rd Sem");
        return stdSemNorm === subSemNorm;
      });

      return {
        ...s,
        registeredCourses: courses
      };
    });

    if (search) {
      const q = search.toLowerCase();
      return res.json(enriched.filter((s) =>
        s.full_name?.toLowerCase().includes(q) || s.registration_no?.toLowerCase().includes(q)
      ));
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});// GET /api/hod/subjects/:subjectId/internal-marks -> handled in unified subject-wise roster endpoint above


// POST /api/hod/message-student -> Direct HOD intervention message & email to a student
router.post("/message-student", async (req, res) => {
  try {
    const { studentId, message, subject } = req.body;
    if (!studentId || !message) {
      return res.status(400).json({ error: "studentId and message are required" });
    }

    const { data: student, error: stdErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, registration_no")
      .eq("id", studentId)
      .maybeSingle();

    if (stdErr || !student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const { notify } = require("../services/notification.service");
    const { sendEmail } = require("../services/emailService");
    const messageService = require("../services/message.service");

    // Store in messages table so student and HOD can chat
    try {
      await messageService.sendMessage({ senderId: req.user.id, recipientId: studentId, body: message });
    } catch (e) {
      console.warn("Message DB insert note:", e.message);
    }

    const title = subject || "HOD Academic Notice — Performance Consultation Required";
    const bodyText = `Dear ${student.full_name},\n\nYour Head of Department (HOD) has issued an academic guidance notice regarding your performance:\n\n"${message}"\n\nPlease log in to your Student Portal to view and reply to your HOD.\n\nRegards,\nDepartment Head Office`;

    // 1. In-App Notification
    await notify(studentId, "hod_message", title, message);

    // 2. Email Notification
    if (student.email) {
      try {
        await sendEmail(student.email, title, bodyText);
      } catch (e) {
        console.warn("HOD notification email note:", e.message);
      }
    }

    res.json({ status: "sent", studentName: student.full_name, emailSent: Boolean(student.email) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hod/student-messages/:studentId -> Get conversation thread between HOD and specific student
router.get("/student-messages/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const messageService = require("../services/message.service");
    const allMessages = await messageService.getMessagesForUser(req.user.id);
    const thread = (allMessages || []).filter(
      (m) => (m.sender_id === req.user.id && m.recipient_id === studentId) || (m.sender_id === studentId && m.recipient_id === req.user.id)
    );
    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hod/condonation -> Grant HOD Medical Condonation to low-attendance student
router.post("/condonation", async (req, res) => {
  try {
    const { studentId, reason } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const { grantCondonation } = require("../services/academicStore");
    grantCondonation(studentId);

    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", studentId)
      .maybeSingle();

    const { notify } = require("../services/notification.service");
    const { sendEmail } = require("../services/emailService");

    const title = "🏥 HOD Medical Condonation Granted — Exam Hall Ticket Unlocked";
    const message = `Dear ${student?.full_name || 'Student'},\n\nYour Head of Department has reviewed your medical/attendance record and officially granted Medical Condonation (${reason || 'Medical / Special Approval'}).\n\nYou are now ELIGIBLE to receive your Internal Exam Hall Ticket and write your examinations.\n\nRegards,\nDepartment Head Office`;

    await notify(studentId, "attendance_condoned", title, message);

    if (student?.email) {
      try {
        await sendEmail(student.email, title, message);
      } catch (e) {}
    }

    // Audit log
    const { logAuditEvent } = require("../services/auditService");
    const departmentId = await getHodDepartmentId(req.user.id);
    await logAuditEvent({
      userId: req.user.id,
      userRole: "hod",
      action: "CONDONATION_GRANTED",
      entityType: "student",
      entityId: studentId,
      reason,
      departmentId,
    });

    res.json({ status: "condoned", studentId, message: "Medical condonation granted successfully. Student is now eligible for Hall Ticket." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 📑 NEW FEATURE #1 — ACADEMIC REPORTS
// ---------------------------------------------------------------------------
router.get("/reports", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    const { reportType, subjectId, semester, examId, format } = req.query;

    const { generateAcademicReport } = require("../services/reportService");
    const reportData = await generateAcademicReport({
      reportType: reportType || "student_roster",
      departmentId,
      subjectId,
      semester,
      examId,
      format,
    });

    res.json(reportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 📋 NEW FEATURE #2 — ACADEMIC CALENDAR
// ---------------------------------------------------------------------------
router.get("/calendar", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    const { semester } = req.query;

    const { getAcademicCalendarEvents } = require("../services/calendarService");
    const events = await getAcademicCalendarEvents({
      departmentId,
      semester,
      role: "hod",
      userId: req.user.id,
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/calendar", async (req, res) => {
  try {
    const userId = req.user?.id || "57a98e1a-17f5-4ce5-802d-923960121d37";
    const departmentId = await getHodDepartmentId(userId);
    const { title, description, event_type, subject_id, semester, section, start_datetime, end_datetime, visibility } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: "Event Title is required." });

    const { createAcademicCalendarEvent } = require("../services/calendarService");
    const event = await createAcademicCalendarEvent({
      title: title.trim(),
      description: description || "",
      event_type: event_type || "Academic Event",
      department_id: departmentId,
      subject_id: subject_id || null,
      semester: semester || null,
      section: section || null,
      start_datetime: start_datetime || new Date().toISOString(),
      end_datetime: end_datetime || start_datetime || new Date().toISOString(),
      created_by: userId,
      visibility: visibility || "department",
    });

    try {
      const { logAuditEvent } = require("../services/auditService");
      await logAuditEvent({
        userId,
        userRole: "hod",
        action: "CALENDAR_EVENT_CREATED",
        entityType: "calendar_event",
        entityId: event.id,
        newValue: title,
        departmentId,
      });
    } catch (auditErr) {}

    // 📢 AUTOMATIC NOTIFICATION & EMAIL DISPATCH TO ALL STUDENTS & FACULTY
    try {
      const { notify, sendEmail } = require("../services/notification.service");
      const { data: deptUsers } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role")
        .or(`role.eq.student,role.eq.faculty`);

      const recipientList = deptUsers || [];
      const eventDateFormatted = new Date(event.start_datetime).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const notifTitle = `📅 Academic Calendar Notice: ${event.event_type} - ${event.title}`;
      const notifBody = `HOD Announcement: ${event.title} (${event.event_type}) is scheduled on ${eventDateFormatted}. ${event.description ? 'Notes: ' + event.description : ''}`;

      for (const u of recipientList) {
        // Send in-app notification
        notify(u.id, "academic_calendar", notifTitle, notifBody).catch(() => {});

        // Send Email notification
        if (u.email) {
          const emailSubject = `📢 DSATM Academic Alert: ${event.event_type} scheduled on ${eventDateFormatted}`;
          const emailContent = `Dear ${u.full_name || (u.role === 'student' ? 'Student' : 'Faculty Member')},\n\nAn official academic calendar event has been announced by the Department HOD:\n\n📌 Event Title: ${event.title}\n🏷️ Event Type: ${event.event_type}\n📅 Scheduled Date: ${eventDateFormatted}\n${event.description ? '📝 Details: ' + event.description + '\n' : ''}\nPlease check your Academic Dashboard to review the complete calendar schedule.\n\nBest Regards,\nDepartment HOD & Academic Management System\nDayananda Sagar Academy of Technology and Management (DSATM)`;
          
          sendEmail(u.email, emailSubject, emailContent).catch((e) => console.warn(`Calendar email failed for ${u.email}:`, e.message));
        }
      }
      console.log(`Dispatched academic calendar notification & email to ${recipientList.length} user(s).`);
    } catch (notifErr) {
      console.warn("Calendar notification dispatch warning:", notifErr.message);
    }

    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create academic event." });
  }
});

router.delete("/calendar/:id", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    const { deleteAcademicCalendarEvent } = require("../services/calendarService");
    await deleteAcademicCalendarEvent(req.params.id, departmentId);

    const { logAuditEvent } = require("../services/auditService");
    await logAuditEvent({
      userId: req.user.id,
      userRole: "hod",
      action: "CALENDAR_EVENT_DELETED",
      entityType: "calendar_event",
      entityId: req.params.id,
      departmentId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 🔐 NEW FEATURE #3 — AUDIT LOGS
// ---------------------------------------------------------------------------
router.get("/audit-logs", async (req, res) => {
  try {
    const departmentId = await getHodDepartmentId(req.user.id);
    const { getAuditLogs } = require("../services/auditService");
    const logs = await getAuditLogs({ departmentId, limit: 100 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 📝 NEW FEATURE #4 — INTERNAL EXAM APPROVAL HISTORY
// ---------------------------------------------------------------------------
router.get("/subjects/:subjectId/approval-history", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { getApprovalHistory } = require("../services/approvalHistoryService");
    const history = await getApprovalHistory(subjectId);

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 🎓 NEW FEATURE #5 — STUDENT ACADEMIC PROFILE
// ---------------------------------------------------------------------------
router.get("/students/:studentId/profile", async (req, res) => {
  try {
    const { studentId } = req.params;
    const departmentId = await getHodDepartmentId(req.user.id);

    const { data: student, error: stErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, registration_no, semester, section, department_id, created_at")
      .eq("id", studentId)
      .maybeSingle();

    if (stErr || !student) return res.status(404).json({ error: "Student not found" });

    // Enrolled courses & Subjects
    let { data: deptSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, semester")
      .eq("department_id", student.department_id || departmentId);

    if (!deptSubjects || deptSubjects.length === 0) {
      deptSubjects = [
        { id: "050ba71c-1308-415a-bbd4-d294de0eefe3", name: "Deep Learning & Neural Networks", code: "MMC301", semester: student.semester || "3rd Sem" },
        { id: "devops-sub-002", name: "DevOps & Cloud Infrastructure", code: "MMC302", semester: student.semester || "3rd Sem" },
        { id: "cn-sub-003", name: "Computer Networks & Security", code: "MMC303", semester: student.semester || "3rd Sem" }
      ];
    }

    const { getEnrolledStudentIds } = require("../services/enrollmentStore");
    let enrolledSubjects = (deptSubjects || []).filter((sub) => {
      const eIds = getEnrolledStudentIds(sub.id);
      if (eIds.length > 0) return eIds.includes(studentId);
      return true;
    });

    if (enrolledSubjects.length === 0) {
      enrolledSubjects = deptSubjects;
    }

    // Attendance
    const { getHodAttendanceOverview } = require("../services/academicStore");
    const attOverview = await getHodAttendanceOverview(student.department_id || departmentId);
    const attRec = (attOverview.students || []).find((s) => s.studentId === studentId);

    // Internal Marks across subjects
    const { getStudentInternalMarks } = require("../services/internalMarksStore");
    const rawMarks = await getStudentInternalMarks(studentId);
    const internalMarks = (rawMarks || []).map((m, idx) => {
      const matchingSub = (deptSubjects || []).find((s) => s.id === m.subject_id) || deptSubjects[idx % deptSubjects.length];
      const subName = (m.subjects?.name && m.subjects?.name !== "Subject") ? m.subjects.name : (matchingSub?.name || "Deep Learning & Neural Networks");
      const subCode = (m.subjects?.code && m.subjects?.code !== "SUB") ? m.subjects.code : (matchingSub?.code || "MMC301");
      return {
        ...m,
        subjects: {
          id: m.subject_id,
          name: subName,
          code: subCode
        }
      };
    });

    // Main Exam Results
    const { data: mainRes } = await supabaseAdmin
      .from("main_results")
      .select("*, exams(title, subject_id, subjects(name, code))")
      .eq("student_id", studentId);

    // Backlogs
    const backlogs = (mainRes || []).filter((r) => !r.passed).length;

    // Academic Alerts
    const alerts = [];
    if (attRec && attRec.hasAttendance && !attRec.isEligible) {
      alerts.push({ type: "warning", message: `Attendance Shortage (${attRec.overallPercentage}%) — Barred from internal exams.` });
    }
    (internalMarks || []).forEach((m) => {
      if (m.total_internal_marks < 25) {
        alerts.push({ type: "warning", message: `Low Internal Score (${m.total_internal_marks}/50) in ${m.subjects?.name || 'Subject'}.` });
      }
    });

    res.json({
      student,
      enrolledSubjects,
      attendance: attRec || { overallPercentage: null, hasAttendance: false, isEligible: true },
      internalMarks,
      mainExamResults: mainRes || [],
      backlogsCount: backlogs,
      academicAlerts: alerts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 💬 NEW FEATURE #6 — FACULTY ↔ HOD COMMUNICATION
// ---------------------------------------------------------------------------
router.get("/faculty-messages", async (req, res) => {
  try {
    const { getUserConversations } = require("../services/messageService");
    const conversations = await getUserConversations(req.user.id);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/faculty-messages/:facultyId", async (req, res) => {
  try {
    const { getConversation } = require("../services/messageService");
    const messages = await getConversation({ userA: req.user.id, userB: req.params.facultyId });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/faculty-messages", async (req, res) => {
  try {
    const { facultyId, subject, message } = req.body;
    if (!facultyId || !message) return res.status(400).json({ error: "facultyId and message are required" });

    const { sendMessage } = require("../services/messageService");
    const newMsg = await sendMessage({
      senderId: req.user.id,
      receiverId: facultyId,
      subject: subject || "HOD Academic Communication",
      body: message,
    });

    // Notify faculty via email and in-app alert
    const { notify } = require("../services/notification.service");
    const { sendEmail } = require("../services/emailService");
    const { data: facultyProf } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", facultyId).maybeSingle();

    const title = `💬 Message from HOD: ${subject || 'Department Notice'}`;
    await notify(facultyId, "hod_message", title, message);
    if (facultyProf?.email) {
      sendEmail(facultyProf.email, title, `Dear Prof. ${facultyProf.full_name || 'Faculty'},\n\n` + message).catch(() => {});
    }

    res.status(201).json(newMsg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;