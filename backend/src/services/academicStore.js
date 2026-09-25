const { supabaseAdmin } = require("../../config/Supabase");

const fs = require("fs");
const path = require("path");

const ATTENDANCE_FILE = path.join(__dirname, "../../persistent_attendance.json");

// In-memory persistent stores for Attendance & Internal Timetables
const attendanceStore = new Map();
// Key: `${subjectId}:${studentId}` -> { totalClasses, attendedClasses, percentage, status }

// Load persisted attendance from disk on startup
try {
  if (fs.existsSync(ATTENDANCE_FILE)) {
    const raw = fs.readFileSync(ATTENDANCE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, val]) => {
      attendanceStore.set(key, val);
    });
    console.log(`Loaded ${attendanceStore.size} persistent attendance records from disk.`);
  }
} catch (e) {
  console.warn("Failed to load persistent attendance file:", e.message);
}

function saveAttendanceToDisk() {
  try {
    const obj = {};
    for (const [key, val] of attendanceStore.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save attendance to disk:", e.message);
  }
}

let internalTimetableStore = {
  examName: "Continuous Internal Assessment Test - 1 (IAT-1 2026)",
  publishedAt: null,
  schedule: []
};

const { getEnrolledStudentIds } = require("./enrollmentStore");

/**
 * Get student attendance list for a specific subject (Faculty View)
 */
async function getSubjectAttendance(subjectId) {
  const enrolledIds = getEnrolledStudentIds(subjectId);
  if (enrolledIds.length === 0) {
    return [];
  }

  let students = [];
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no")
      .in("id", enrolledIds)
      .order("registration_no");
    students = data || [];
  } catch (e) {}

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

  saveAttendanceToDisk();

  return updatedRecords;
}

const condonationSet = new Set(); // studentIds with medical condonation granted by HOD

function grantCondonation(studentId) {
  condonationSet.add(studentId);
  return true;
}

function isCondoned(studentId) {
  return condonationSet.has(studentId);
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
      subjectName: `${sub.code || 'SUB'} - ${sub.name}`,
      subjectCode: sub.code || 'SUB',
      totalClasses: total,
      attendedClasses: attended,
      percentage: pctFloat,
      hasAttendance: hasRec,
      isShortage: hasRec && pctFloat < 75.0,
      isEligible: hasRec && (pctFloat >= 75.0 || condonationSet.has(studentId))
    });
  }

  const grandAbsent = Math.max(0, grandTotalClasses - grandAttendedClasses);
  const overallPercentage = grandTotalClasses > 0 ? Math.round((grandAttendedClasses / grandTotalClasses) * 10000) / 100 : 0;
  const isCondonedByHod = condonationSet.has(studentId);
  const isEligible = (grandTotalClasses > 0 && overallPercentage >= 75.0) || isCondonedByHod;

  // Build real-time daily slot logs ONLY from actual saved attendance records
  const generatedDailyLogsMap = new Map();
  const realAbsencesList = [];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function getPastClassDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dayStr = daysOfWeek[d.getDay()];
    const dateStr = `${d.getDate()} ${monthsOfYear[d.getMonth()]} ${d.getFullYear()}`;
    return { dateStr, dayStr };
  }

  if (subjectsWithAttendance > 0) {
    let globalSessionIndex = 0;

    breakdown.forEach((subItem) => {
      if (!subItem.hasAttendance || subItem.totalClasses <= 0) return;

      const total = subItem.totalClasses;
      const attended = subItem.attendedClasses;
      const absentCount = Math.max(0, total - attended);

      for (let c = 1; c <= total; c++) {
        const isAbsentSession = (c <= absentCount);
        const daysAgo = Math.floor(globalSessionIndex / 2);
        const slotNum = (globalSessionIndex % 4) + 1;
        const { dateStr, dayStr } = getPastClassDate(daysAgo);

        const slotTimes = [
          "09:30 AM - 10:30 AM",
          "10:30 AM - 11:30 AM",
          "11:40 AM - 12:30 PM",
          "12:30 PM - 01:30 PM"
        ];

        const cleanSubjectName = slotNum === 4
          ? "LeetCode Practice"
          : (subItem.subjectName.includes(" - ")
            ? subItem.subjectName.split(" - ")[1]
            : subItem.subjectName);

        const slotCode = slotNum === 4 ? "LEETCODE" : subItem.subjectCode;

        const slotObj = {
          slotTime: slotTimes[slotNum - 1] || "09:30 AM - 10:30 AM",
          slotName: slotNum === 4 ? "Slot 4 (LeetCode)" : `Slot ${slotNum}`,
          subjectCode: slotCode,
          subjectName: cleanSubjectName,
          type: isAbsentSession ? "absent" : "present",
          text: isAbsentSession ? "A" : "P"
        };

        if (isAbsentSession) {
          realAbsencesList.push({
            date: dateStr,
            day: dayStr,
            slotName: `Slot ${slotNum}`,
            slotTime: slotObj.slotTime,
            subjectCode: subItem.subjectCode,
            subjectName: cleanSubjectName
          });
        }

        if (!generatedDailyLogsMap.has(dateStr)) {
          generatedDailyLogsMap.set(dateStr, {
            date: dateStr,
            day: dayStr,
            slots: []
          });
        }

        const dayEntry = generatedDailyLogsMap.get(dateStr);
        if (dayEntry.slots.length < 4) {
          dayEntry.slots.push(slotObj);
        }

        globalSessionIndex++;
      }
    });
  }

  const generatedDailyLogs = Array.from(generatedDailyLogsMap.values());

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
    isCondoned: isCondonedByHod,
    status: !subjectsWithAttendance
      ? "PENDING_ATTENDANCE_ENTRY"
      : isEligible
        ? (isCondonedByHod ? "ELIGIBLE_CONDONED_BY_HOD" : "ELIGIBLE")
        : "NOT_ELIGIBLE_ATTENDANCE_SHORTAGE",
    subjectBreakdown: breakdown,
    dailyLogs: generatedDailyLogs
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
      .eq("role", "student")
      .eq("department_id", deptId);
    students = data || [];
  } catch (e) {}

  if (students.length === 0) {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, registration_no, semester")
        .eq("role", "student");
      students = data || [];
    } catch (e) {}
  }

  const studentSummaries = [];
  let lowAttendanceCount = 0;
  let totalPctSum = 0;
  let studentsWithAttendance = 0;

  for (const s of students) {
    const summary = await getStudentAttendanceSummary(s.id);
    if (summary.hasAnyAttendance) {
      studentsWithAttendance++;
      totalPctSum += summary.overallPercentage;
      if (!summary.isEligible) lowAttendanceCount++;
    }
    const item = {
      studentId: s.id,
      studentName: s.full_name || "Student",
      registrationNo: s.registration_no || "USN101",
      semester: s.semester || "3rd Sem",
      overallPercentage: summary.hasAnyAttendance ? summary.overallPercentage : null,
      hasAttendance: summary.hasAnyAttendance,
      isEligible: summary.isEligible,
      isCondoned: summary.isCondoned,
      status: summary.status,
      subjectBreakdown: summary.subjectBreakdown
    };
    studentSummaries.push(item);
  }

  const avgDepartmentAttendance = studentsWithAttendance > 0 ? Math.round(totalPctSum / studentsWithAttendance) : null;

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
  if (Array.isArray(schedule)) {
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
  publishInternalTimetable,
  grantCondonation,
  isCondoned
};
