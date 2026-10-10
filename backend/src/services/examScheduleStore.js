const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");
const { sendEmail, notify } = require("./notification.service");
const { createNotificationLog, isDuplicateNotifSent } = require("./notificationLogStore");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const SCHEDULES_FILE = path.join(DATA_DIR, "persistent_exam_schedules.json");

const schedulesStore = [];

// Load persisted exam schedules from disk
try {
  if (fs.existsSync(SCHEDULES_FILE)) {
    const raw = fs.readFileSync(SCHEDULES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      schedulesStore.push(...parsed);
    }
    console.log(`Loaded ${schedulesStore.length} persistent main exam schedules from disk.`);
  }
} catch (e) {
  console.warn("Failed to load persistent exam schedules file:", e.message);
}

function saveSchedulesToDisk() {
  try {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedulesStore, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save exam schedules to disk:", e.message);
  }
}

/**
 * Helper: Parse time string (e.g. "09:30 AM", "14:00", "2:00 PM") to total minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toUpperCase();
  let [timePart, modifier] = s.split(/\s+/);
  let [hours, minutes] = (timePart || "0:0").split(":").map(Number);
  hours = hours || 0;
  minutes = minutes || 0;

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Validate schedule for room availability and student cohort conflicts
 */
function validateScheduleConflicts({ scheduleId, subjectId, examDate, startTime, endTime, roomId, departmentId, semester }) {
  if (!examDate || !startTime || !endTime) return;

  const newStartMin = parseTimeToMinutes(startTime);
  const newEndMin = parseTimeToMinutes(endTime);

  if (newStartMin >= newEndMin) {
    throw new Error(`Invalid exam time window: Start time (${startTime}) must be strictly earlier than End time (${endTime}).`);
  }

  for (const existing of schedulesStore) {
    if (existing.id === scheduleId || existing.status === "CANCELLED") continue;

    // Compare date
    if (existing.examDate === examDate || existing.exam_date === examDate) {
      const exStartMin = parseTimeToMinutes(existing.startTime || existing.start_time || "09:30 AM");
      const exEndMin = parseTimeToMinutes(existing.endTime || existing.end_time || "12:30 PM");

      // Check time overlap: (start1 < end2) and (end1 > start2)
      const hasTimeOverlap = newStartMin < exEndMin && newEndMin > exStartMin;

      if (hasTimeOverlap) {
        // 1. Check Room Conflict
        if (roomId && (existing.roomId === roomId || existing.room_id === roomId)) {
          throw new Error(`Room Conflict! Selected exam hall (${existing.roomNumber || existing.room_number || roomId}) is already booked for "${existing.title}" on ${examDate} from ${existing.startTime || '09:30 AM'} to ${existing.endTime || '12:30 PM'}.`);
        }

        // 2. Check Student Cohort Overlap Conflict (Same Department & Semester)
        if (departmentId && semester && (existing.departmentId === departmentId || existing.department_id === departmentId) && (existing.semester === semester)) {
          throw new Error(`Student Cohort Overlap Conflict! The student cohort (${existing.departmentName || 'Dept'}, ${semester}) already has another exam scheduled ("${existing.title}") on ${examDate} during ${existing.startTime || '09:30 AM'} - ${existing.endTime || '12:30 PM'}.`);
        }
      }
    }
  }
}

/**
 * Get all main exam schedules (with optional department & semester filters)
 */
async function getExamSchedules({ departmentId, semester, status } = {}) {
  let dbExams = [];
  try {
    let query = supabaseAdmin
      .from("exams")
      .select("*, subjects(name, code, department_id, departments(name))")
      .eq("type", "main")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (!error && data) dbExams = data;
  } catch (e) {}

  const mergedMap = new Map();

  // Populate from disk/memory store first
  schedulesStore.forEach((sc) => {
    mergedMap.set(sc.id, sc);
  });

  // Merge DB records
  dbExams.forEach((e) => {
    const existing = mergedMap.get(e.id) || {};
    const subName = e.subjects?.name || existing.subjectName || "Subject";
    const subCode = e.subjects?.code || existing.subjectCode || "CODE";
    const deptId = e.subjects?.department_id || existing.departmentId;
    const deptName = e.subjects?.departments?.name || existing.departmentName || "Department";

    mergedMap.set(e.id, {
      ...existing,
      id: e.id,
      subjectId: e.subject_id,
      subject_id: e.subject_id,
      subjectName: subName,
      subjectCode: subCode,
      departmentId: deptId,
      departmentName: deptName,
      title: existing.title || e.title || "Main Examination",
      totalMarks: Number(existing.totalMarks || e.total_marks || 100),
      total_marks: Number(existing.totalMarks || e.total_marks || 100),
      status: (existing.status || e.status || "DRAFT").toUpperCase(),
      examDate: existing.examDate || existing.exam_date || e.created_at?.split("T")[0] || "2026-07-20",
      startTime: existing.startTime || existing.start_time || "09:30 AM",
      endTime: existing.endTime || existing.end_time || "12:30 PM",
      duration: existing.duration || "3 Hours",
      sessionName: existing.sessionName || "Semester End Examinations: July - August 2026",
      academicYear: existing.academicYear || "2025–2026",
      semester: existing.semester || e.semester || "3rd Sem",
      centreId: existing.centreId || "centre-dsatm-main",
      roomId: existing.roomId || "room-101",
      centreName: existing.centreName || "DSATM Main Academic Block Examination Centre",
      roomNumber: existing.roomNumber || "LH-101",
      created_at: e.created_at || existing.created_at || new Date().toISOString(),
    });
  });

  let results = Array.from(mergedMap.values());

  if (departmentId && departmentId !== "ALL") {
    const isMcaDept = departmentId === "37909cba-a75d-428e-9181-fddf9920fb0b" || departmentId === "ba56ce7b-aead-434d-8e7b-222253a3b56e";
    results = results.filter((s) =>
      !s.departmentId ||
      s.departmentId === departmentId ||
      s.department_id === departmentId ||
      (isMcaDept && (String(s.departmentName || "").toUpperCase().includes("MCA") || String(s.departmentName || "").toLowerCase().includes("computer applications")))
    );
  }
  if (semester && semester !== "ALL") {
    results = results.filter((s) => !s.semester || s.semester === semester || s.semester.toLowerCase() === semester.toLowerCase());
  }
  if (status && status !== "ALL") {
    results = results.filter((s) => s.status === status.toUpperCase());
  }

  return results;
}

/**
 * Resolve MCA HOD details from database
 */
async function getMcaHodDetails(departmentId) {
  try {
    let hodProfile = null;
    let deptName = "Computer Applications (MCA)";

    if (departmentId) {
      const { data: dept } = await supabaseAdmin.from("departments").select("name, hod_id").eq("id", departmentId).maybeSingle();
      if (dept) {
        deptName = dept.name || deptName;
        if (dept.hod_id) {
          const { data: hod } = await supabaseAdmin.from("profiles").select("id, full_name, email").eq("id", dept.hod_id).maybeSingle();
          if (hod?.email) hodProfile = hod;
        }
      }
    }

    if (!hodProfile) {
      // Find MCA Department by name
      const { data: depts } = await supabaseAdmin
        .from("departments")
        .select("id, name, hod_id")
        .or("name.ilike.%MCA%,name.ilike.%Computer Applications%");

      for (const d of depts || []) {
        if (d.hod_id) {
          const { data: hod } = await supabaseAdmin.from("profiles").select("id, full_name, email").eq("id", d.hod_id).maybeSingle();
          if (hod?.email) {
            hodProfile = hod;
            deptName = d.name;
            break;
          }
        }
      }
    }

    if (!hodProfile) {
      // Fallback lookup: profile with role 'hod' in MCA department
      const { data: hod } = await supabaseAdmin.from("profiles").select("id, full_name, email").eq("role", "hod").limit(1).maybeSingle();
      if (hod?.email) hodProfile = hod;
    }

    return { hodProfile, deptName };
  } catch (e) {
    return { hodProfile: null, deptName: "MCA Department" };
  }
}

/**
 * Notify MCA HOD when an MCA Main Exam schedule is created or published
 */
async function notifyMcaHodOfExamSchedule(schedule, isPublication = false) {
  const isMca = String(schedule.departmentName || "").toUpperCase().includes("MCA") ||
                String(schedule.departmentName || "").toLowerCase().includes("computer applications") ||
                String(schedule.subjectName || "").toUpperCase().includes("MCA");

  if (!isMca) return null;

  const { hodProfile, deptName } = await getMcaHodDetails(schedule.departmentId);
  if (!hodProfile || !hodProfile.email) {
    console.warn(`[NOTIF WARNING] MCA HOD email not configured in database for ${deptName}. Notification skipped.`);
    return { warning: "MCA HOD email not configured in database." };
  }

  const notifType = isPublication ? "MCA_SCHEDULE_PUBLISHED" : "MCA_SCHEDULE_CREATED";
  const notifKey = `mca-hod-${schedule.id}-${isPublication ? 'published' : 'created'}`;

  // Idempotency check: prevent duplicate emails
  if (isDuplicateNotifSent(hodProfile.email, notifType, notifKey)) {
    console.log(`[NOTIF IDEMPOTENT] MCA HOD notification already dispatched to ${hodProfile.email} for schedule ${schedule.id}.`);
    return { skipped: true, recipient: hodProfile.email };
  }

  const subject = isPublication
    ? `Official MCA Main Examination Schedule Published — ${schedule.title}`
    : `New MCA Main Examination Schedule Created — ${schedule.title}`;

  const statusLabel = isPublication ? "OFFICIALLY PUBLISHED" : `DRAFT (${schedule.status || 'DRAFT'})`;

  const body = `Dear ${hodProfile.full_name || 'HOD Ma\'am'},\n\nA ${isPublication ? 'published' : 'new'} Main Examination schedule has been ${isPublication ? 'officially published' : 'created'} by the Examination Control Department for your department:\n\n` +
    `📌 Exam Title: ${schedule.title}\n` +
    `📚 Subject: ${schedule.subjectName} (${schedule.subjectCode})\n` +
    `🏛️ Department: ${deptName}\n` +
    `🎓 Semester: ${schedule.semester || '3rd Sem'}\n` +
    `📅 Exam Date: ${schedule.examDate}\n` +
    `⏰ Time Slot: ${schedule.startTime} - ${schedule.endTime} (${schedule.duration || '3 Hours'})\n` +
    `📍 Examination Centre: ${schedule.centreName || 'DSATM Main Centre'} (${schedule.roomNumber || 'LH-101'})\n` +
    `📊 Status: ${statusLabel}\n\n` +
    `${!isPublication ? 'Note: This schedule is currently in DRAFT status and is pending official publication.\n\n' : ''}` +
    `Regards,\n` +
    `DSATM Examination Control Department`;

  let deliveryStatus = "SENT";
  let failureReason = null;

  try {
    await sendEmail(hodProfile.email, subject, body);
    await notify(hodProfile.id, isPublication ? "mca_schedule_published" : "mca_schedule_created", subject, body, schedule.id);
  } catch (err) {
    deliveryStatus = "FAILED";
    failureReason = err.message;
  }

  await createNotificationLog({
    id: notifKey,
    student_id: hodProfile.id,
    channel: "EMAIL",
    notification_type: notifType,
    recipient: hodProfile.email,
    subject,
    message: body,
    status: deliveryStatus,
    failure_reason: failureReason,
    associated_id: notifKey,
  });

  return { recipient: hodProfile.email, status: deliveryStatus, failureReason };
}

/**
 * Create a new Main Exam schedule
 */
async function createExamSchedule(payload, authorUser) {
  const {
    subjectId, title, totalMarks, examDate, startTime, endTime, duration,
    sessionName, academicYear, semester, centreId, roomId, centreName, roomNumber
  } = payload;

  if (!subjectId || !title || !examDate || !startTime || !endTime) {
    throw new Error("subjectId, title, examDate, startTime, and endTime are required fields.");
  }

  // Fetch real subject details from DB or fallback gracefully
  let subjectObj = null;
  try {
    const { data } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, department_id, departments(name)")
      .eq("id", subjectId)
      .maybeSingle();
    subjectObj = data;
  } catch (e) {}

  if (!subjectObj) {
    subjectObj = {
      id: subjectId,
      name: payload.subjectName || "Cloud Computing & DevOps",
      code: payload.subjectCode || "22MCA31",
      department_id: payload.departmentId || "37909cba-a75d-428e-9181-fddf9920fb0b",
      departments: { name: payload.departmentName || "Master of Computer Applications (MCA)" }
    };
  }

  const subjectName = subjectObj.name;
  const subjectCode = subjectObj.code || "CODE";
  const departmentId = subjectObj.department_id;
  const departmentName = subjectObj.departments?.name || "Department";

  // Validate room availability & cohort conflicts
  validateScheduleConflicts({
    scheduleId: null,
    subjectId,
    examDate,
    startTime,
    endTime,
    roomId,
    departmentId,
    semester: semester || "3rd Sem",
  });

  const scheduleId = `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const status = (payload.status || "DRAFT").toUpperCase();
  const authorId = authorUser?.id || "examdept";

  const scheduleRecord = {
    id: scheduleId,
    subjectId,
    subject_id: subjectId,
    subjectName,
    subjectCode,
    departmentId,
    departmentName,
    title,
    totalMarks: Number(totalMarks) || 100,
    total_marks: Number(totalMarks) || 100,
    status,
    examDate,
    startTime,
    endTime,
    duration: duration || "3 Hours",
    sessionName: sessionName || "Semester End Examinations: July - August 2026",
    academicYear: academicYear || "2025–2026",
    semester: semester || "3rd Sem",
    centreId: centreId || "centre-dsatm-main",
    roomId: roomId || "room-101",
    centreName: centreName || "DSATM Main Academic Block Examination Centre",
    roomNumber: roomNumber || "LH-101",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  schedulesStore.unshift(scheduleRecord);
  saveSchedulesToDisk();

  // Upsert to DB `exams` table
  try {
    await supabaseAdmin.from("exams").insert({
      id: scheduleId,
      subject_id: subjectId,
      type: "main",
      title,
      total_marks: Number(totalMarks) || 100,
      status: status.toLowerCase(),
      created_by: authorId,
    });
  } catch (e) {}

  await logAuditEvent({
    userId: authorId,
    userRole: "examdept",
    action: "MAIN_EXAM_SCHEDULE_CREATED",
    entityType: "exams",
    entityId: scheduleId,
    newValue: `Schedule: "${title}" (${subjectName}), Date: ${examDate}, Time: ${startTime}-${endTime}, Status: ${status}`,
  });

  // Notify MCA HOD if this is an MCA exam
  const hodNotifResult = await notifyMcaHodOfExamSchedule(scheduleRecord, false);

  return { schedule: scheduleRecord, hodNotification: hodNotifResult };
}

/**
 * Update an existing Main Exam schedule
 */
async function updateExamSchedule(scheduleId, payload, authorUser) {
  const existingIdx = schedulesStore.findIndex((s) => s.id === scheduleId);
  const authorId = authorUser?.id || "examdept";

  const current = existingIdx !== -1 ? schedulesStore[existingIdx] : null;

  const subjectId = payload.subjectId || current?.subjectId;
  const examDate = payload.examDate || current?.examDate;
  const startTime = payload.startTime || current?.startTime;
  const endTime = payload.endTime || current?.endTime;
  const roomId = payload.roomId || current?.roomId;
  const departmentId = payload.departmentId || current?.departmentId;
  const semester = payload.semester || current?.semester;

  validateScheduleConflicts({
    scheduleId,
    subjectId,
    examDate,
    startTime,
    endTime,
    roomId,
    departmentId,
    semester,
  });

  const nextStatus = (payload.status || current?.status || "DRAFT").toUpperCase();
  const wasPublished = current?.status === "PUBLISHED";
  const isNowPublished = nextStatus === "PUBLISHED" && !wasPublished;

  const updatedRecord = {
    ...current,
    ...payload,
    id: scheduleId,
    status: nextStatus,
    updated_at: new Date().toISOString(),
    published_at: isNowPublished ? new Date().toISOString() : current?.published_at || null,
  };

  if (existingIdx !== -1) schedulesStore[existingIdx] = updatedRecord;
  else schedulesStore.unshift(updatedRecord);

  saveSchedulesToDisk();

  try {
    await supabaseAdmin
      .from("exams")
      .update({
        title: updatedRecord.title,
        total_marks: updatedRecord.totalMarks,
        status: nextStatus.toLowerCase(),
      })
      .eq("id", scheduleId);
  } catch (e) {}

  await logAuditEvent({
    userId: authorId,
    userRole: "examdept",
    action: isNowPublished ? "MAIN_EXAM_SCHEDULE_PUBLISHED" : "MAIN_EXAM_SCHEDULE_UPDATED",
    entityType: "exams",
    entityId: scheduleId,
    newValue: `Schedule: "${updatedRecord.title}", Date: ${updatedRecord.examDate}, Status: ${nextStatus}`,
  });

  let hodNotif = null;
  if (isNowPublished) {
    hodNotif = await notifyMcaHodOfExamSchedule(updatedRecord, true);
  }

  return { schedule: updatedRecord, hodNotification: hodNotif };
}

/**
 * Publish an official Main Exam schedule
 */
async function publishExamSchedule(scheduleId, authorUser) {
  return updateExamSchedule(scheduleId, { status: "PUBLISHED" }, authorUser);
}

/**
 * Cancel a Main Exam schedule
 */
async function cancelExamSchedule(scheduleId, reason, authorUser) {
  const existing = schedulesStore.find((s) => s.id === scheduleId);
  if (!existing) throw new Error("Schedule not found");

  existing.status = "CANCELLED";
  existing.cancellation_reason = reason || "Schedule cancelled by Exam Dept";
  existing.updated_at = new Date().toISOString();

  saveSchedulesToDisk();

  try {
    await supabaseAdmin.from("exams").update({ status: "cancelled" }).eq("id", scheduleId);
  } catch (e) {}

  await logAuditEvent({
    userId: authorUser?.id || "examdept",
    userRole: "examdept",
    action: "MAIN_EXAM_SCHEDULE_CANCELLED",
    entityType: "exams",
    entityId: scheduleId,
    newValue: `Cancelled Schedule: "${existing.title}". Reason: ${reason || 'Cancelled'}`,
  });

  return existing;
}

/**
 * Delete a Main Exam schedule
 */
async function deleteExamSchedule(scheduleId, authorUser) {
  const idx = schedulesStore.findIndex((s) => s.id === scheduleId);
  if (idx !== -1) {
    schedulesStore.splice(idx, 1);
    saveSchedulesToDisk();
  }

  try {
    await supabaseAdmin.from("exams").delete().eq("id", scheduleId);
  } catch (e) {}

  await logAuditEvent({
    userId: authorUser?.id || "examdept",
    userRole: "examdept",
    action: "MAIN_EXAM_SCHEDULE_DELETED",
    entityType: "exams",
    entityId: scheduleId,
  });

  return { success: true, scheduleId };
}

module.exports = {
  getExamSchedules,
  createExamSchedule,
  updateExamSchedule,
  publishExamSchedule,
  cancelExamSchedule,
  deleteExamSchedule,
  notifyMcaHodOfExamSchedule,
};
