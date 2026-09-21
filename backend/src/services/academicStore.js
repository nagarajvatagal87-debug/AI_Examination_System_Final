const { supabaseAdmin } = require("../../config/Supabase");

// In-memory persistent stores for Attendance & Internal Timetables
const attendanceStore = new Map();
// Key: `${subjectId}:${studentId}` -> { totalClasses, attendedClasses, percentage, status }

let internalTimetableStore = {
  examName: "Continuous Internal Assessment Test - 1 (IAT-1 2026)",
  publishedAt: new Date().toISOString(),
  schedule: [
    {
      slNo: 1,
      subjectCode: "MMC321",
      subjectName: "Deep Learning",
      examDate: "2026-10-05",
      timeSlot: "10:00 AM - 11:30 AM",
      hallNo: "Block-A Room 302",
      totalMarks: 50
    },
    {
      slNo: 2,
      subjectCode: "MMC322",
      subjectName: "Database Management Systems",
      examDate: "2026-10-06",
      timeSlot: "10:00 AM - 11:30 AM",
      hallNo: "Block-A Room 302",
      totalMarks: 50
    },
    {
      slNo: 3,
      subjectCode: "MMC323",
      subjectName: "Java Enterprise Programming",
      examDate: "2026-10-07",
      timeSlot: "10:00 AM - 11:30 AM",
      hallNo: "Block-B Room 405",
      totalMarks: 50
    },
    {
      slNo: 4,
      subjectCode: "MMC324",
      subjectName: "Computer Networks",
      examDate: "2026-10-08",
      timeSlot: "10:00 AM - 11:30 AM",
      hallNo: "Block-B Room 405",
      totalMarks: 50
    }
  ]
};

/**
 * Get student attendance list for a specific subject (Faculty View)
 */
async function getSubjectAttendance(subjectId) {
  // Fetch department_id for this subject
  let deptId = "dept-mca";
  try {
    const { data: sub } = await supabaseAdmin
      .from("subjects")
      .select("department_id")
      .eq("id", subjectId)
      .maybeSingle();
    if (sub?.department_id) deptId = sub.department_id;
  } catch (e) {}

  // Fetch student profiles
  let students = [];
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no")
      .eq("role", "student")
      .eq("department_id", deptId);
    students = data || [];
  } catch (e) {}

  if (students.length === 0) {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, registration_no")
        .eq("role", "student");
      students = data || [];
    } catch (e) {}
  }

  // Map students with attendance records
  return students.map((s, idx) => {
    const key = `${subjectId}:${s.id}`;
    const rec = attendanceStore.get(key);

    const hasRec = Boolean(rec && rec.totalClasses > 0);
    const totalClasses = hasRec ? rec.totalClasses : 0;
    const attendedClasses = hasRec ? rec.attendedClasses : 0;

    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
    const isEligible = hasRec && percentage >= 75;

    return {
      student_id: s.id,
      full_name: s.full_name || `Student ${idx + 1}`,
      registration_no: s.registration_no || `1DS23MCA00${idx + 1}`,
      totalClasses,
      attendedClasses,
      percentage,
      hasAttendance: hasRec,
      isEligible,
      status: hasRec ? (isEligible ? "ELIGIBLE" : "NOT_ELIGIBLE_ATTENDANCE_SHORTAGE") : "PENDING_ATTENDANCE_ENTRY",
      updatedAt: rec?.updatedAt || null
    };
  });
}

/**
 * Update attendance for a subject (Faculty update)
 */
async function updateSubjectAttendance(subjectId, attendanceList) {
  if (!Array.isArray(attendanceList)) return [];

  const updatedRecords = [];
  attendanceList.forEach((item) => {
    const studentId = item.student_id || item.studentId;
    const totalClasses = Math.max(1, Number(item.totalClasses || item.total_classes || 40));
    const attendedClasses = Math.min(totalClasses, Math.max(0, Number(item.attendedClasses || item.attended_classes || 0)));
    const percentage = Math.round((attendedClasses / totalClasses) * 100);
    const isEligible = percentage >= 75;

    const record = {
      subjectId,
      studentId,
      totalClasses,
      attendedClasses,
      percentage,
      isEligible,
      status: isEligible ? "ELIGIBLE" : "NOT_ELIGIBLE_ATTENDANCE_SHORTAGE",
      updatedAt: new Date().toISOString()
    };

    attendanceStore.set(`${subjectId}:${studentId}`, record);
    updatedRecords.push(record);
  });

  return updatedRecords;
}

/**
 * Get student overall attendance percentage across all subjects (Student & HOD view)
 */
async function getStudentAttendanceSummary(studentId) {
  let subjects = [];
  try {
    const { data } = await supabaseAdmin.from("subjects").select("id, name, code");
    subjects = data || [];
  } catch (e) {}

  if (subjects.length === 0) {
    subjects = [
      { id: "sub-genai", name: "Introduction to Generative AI-Theory", code: "MMC311" },
      { id: "sub-dl", name: "Deep Learning-Theory", code: "MMC321" },
      { id: "sub-devops", name: "Devops-Theory", code: "MMC335" }
    ];
  }

  let grandTotalClasses = 0;
  let grandAttendedClasses = 0;
  let subjectsWithAttendance = 0;
  const breakdown = [];

  for (let idx = 0; idx < subjects.length; idx++) {
    const sub = subjects[idx];
    const key = `${sub.id}:${studentId}`;
    const rec = attendanceStore.get(key);

    const hasRec = Boolean(rec && rec.totalClasses > 0);
    let total = hasRec ? rec.totalClasses : 0;
    let attended = hasRec ? rec.attendedClasses : 0;

    if (hasRec) subjectsWithAttendance++;

    const pctFloat = total > 0 ? Math.round((attended / total) * 10000) / 100 : 0;
    grandTotalClasses += total;
    grandAttendedClasses += attended;

    breakdown.push({
      subjectId: sub.id,
      subjectName: `${sub.code} - ${sub.name}`,
      subjectCode: sub.code,
      totalClasses: total,
      attendedClasses: attended,
      percentage: pctFloat,
      hasAttendance: hasRec,
      isShortage: hasRec && pctFloat < 75.0,
      isEligible: hasRec && pctFloat >= 75.0
    });
  }

  const grandAbsent = Math.max(0, grandTotalClasses - grandAttendedClasses);
  const overallPercentage = grandTotalClasses > 0 ? Math.round((grandAttendedClasses / grandTotalClasses) * 10000) / 100 : 0;
  const isEligible = grandTotalClasses > 0 && overallPercentage >= 75.0;

  // Daily logs generated strictly if attendance has been submitted by faculty
  const dailyLogs = grandTotalClasses > 0 ? [
    { date: "21-Sep-26", day: "Mon", slots: [{ text: "P", type: "present" }, { text: "P", type: "present" }, { text: "P", type: "present" }, { text: "-", type: "none" }] },
    { date: "18-Sep-26", day: "Fri", slots: [{ text: "P", type: "present" }, { text: "P", type: "present" }, { text: "-", type: "none" }, { text: "-", type: "none" }] },
    { date: "17-Sep-26", day: "Thu", slots: [{ text: "P", type: "present" }, { text: "P", type: "present" }, { text: "P", type: "present" }, { text: "-", type: "none" }] },
    { date: "16-Sep-26", day: "Wed", slots: [{ text: "P", type: "present" }, { text: "P", type: "present" }, { text: "-", type: "none" }, { text: "-", type: "none" }] }
  ] : [];

  return {
    studentId,
    semesterLabel: "Sem 3",
    academicYear: "A.Y. 2026-27 - Odd",
    hasAnyAttendance: subjectsWithAttendance > 0,
    overallPercentage,
    totalClasses: grandTotalClasses,
    attendedClasses: grandAttendedClasses,
    absentClasses: grandAbsent,
    pendingClasses: 0,
    noAttendanceClasses: 0,
    isEligible,
    status: isEligible ? "ELIGIBLE" : "NOT_ELIGIBLE_ATTENDANCE_SHORTAGE",
    subjectBreakdown: breakdown,
    dailyLogs
  };
}

/**
 * Get HOD department attendance overview
 */
async function getHodAttendanceOverview(deptId = "dept-mca") {
  let students = [];
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester")
      .eq("role", "student");
    students = data || [];
  } catch (e) {}

  const studentSummaries = [];
  let lowAttendanceCount = 0;
  let totalPctSum = 0;

  for (const s of students) {
    const summary = await getStudentAttendanceSummary(s.id);
    const item = {
      studentId: s.id,
      studentName: s.full_name || "Student",
      registrationNo: s.registration_no || "1DS23MCA001",
      semester: s.semester || "3rd Sem",
      overallPercentage: summary.overallPercentage,
      isEligible: summary.isEligible,
      subjectBreakdown: summary.subjectBreakdown
    };
    if (!summary.isEligible) lowAttendanceCount++;
    totalPctSum += summary.overallPercentage;
    studentSummaries.push(item);
  }

  const avgDepartmentAttendance = students.length > 0 ? Math.round(totalPctSum / students.length) : 85;

  return {
    totalStudents: students.length,
    lowAttendanceCount,
    avgDepartmentAttendance,
    students: studentSummaries
  };
}

/**
 * Timetable functions
 */
function getInternalTimetable() {
  return internalTimetableStore;
}

function publishInternalTimetable(examName, schedule) {
  if (examName) internalTimetableStore.examName = examName;
  if (Array.isArray(schedule) && schedule.length > 0) {
    internalTimetableStore.schedule = schedule;
  }
  internalTimetableStore.publishedAt = new Date().toISOString();
  return internalTimetableStore;
}

module.exports = {
  getSubjectAttendance,
  updateSubjectAttendance,
  getStudentAttendanceSummary,
  getHodAttendanceOverview,
  getInternalTimetable,
  publishInternalTimetable
};
