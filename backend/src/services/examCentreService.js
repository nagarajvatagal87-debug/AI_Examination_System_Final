const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const CENTRES_FILE = path.join(DATA_DIR, "persistent_exam_centres.json");

const memoryCentres = [
  {
    id: "centre-dsatm-main",
    name: "DSATM Main Academic Block Examination Centre",
    code: "CENTRE-101",
    address: "Kanakapura Road, Udayapura, Bengaluru - 560082",
    capacity: 600,
    status: "ACTIVE",
    rooms: [
      { id: "room-101", building: "Block A", floor: "1st Floor", room_number: "LH-101", capacity: 40, status: "ACTIVE" },
      { id: "room-102", building: "Block A", floor: "1st Floor", room_number: "LH-102", capacity: 40, status: "ACTIVE" },
      { id: "room-201", building: "Block A", floor: "2nd Floor", room_number: "LH-201", capacity: 40, status: "ACTIVE" },
      { id: "room-202", building: "Block A", floor: "2nd Floor", room_number: "LH-202", capacity: 40, status: "ACTIVE" },
      { id: "room-301", building: "Block B", floor: "3rd Floor", room_number: "CS-LAB-1", capacity: 60, status: "ACTIVE" },
    ]
  }
];

const memoryAllocations = [];
const memoryHallTickets = [];

// Load persisted exam centre data from disk
try {
  if (fs.existsSync(CENTRES_FILE)) {
    const raw = fs.readFileSync(CENTRES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.centres) && parsed.centres.length > 0) {
      memoryCentres.length = 0;
      memoryCentres.push(...parsed.centres);
    }
    if (Array.isArray(parsed.allocations)) memoryAllocations.push(...parsed.allocations);
    if (Array.isArray(parsed.hallTickets)) memoryHallTickets.push(...parsed.hallTickets);
    console.log(`Loaded ${memoryCentres.length} exam centres from disk.`);
  }
} catch (e) {
  console.warn("Failed to load exam centres file:", e.message);
}

function saveCentresToDisk() {
  try {
    fs.writeFileSync(
      CENTRES_FILE,
      JSON.stringify({ centres: memoryCentres, allocations: memoryAllocations, hallTickets: memoryHallTickets }, null, 2),
      "utf8"
    );
  } catch (e) {
    console.warn("Failed to save exam centres to disk:", e.message);
  }
}

/**
 * Get all exam centres & rooms
 */
async function getExamCentres() {
  let dbCentres = [];
  try {
    const { data, error } = await supabaseAdmin.from("exam_centres").select("*, exam_rooms(*)");
    if (!error && data && data.length > 0) dbCentres = data;
  } catch (e) {}

  return dbCentres.length > 0 ? dbCentres : memoryCentres;
}

/**
 * Add an exam centre
 */
async function createExamCentre(payload) {
  const newCentre = {
    id: `centre-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name: payload.name,
    code: payload.code || `CENTRE-${Math.floor(100 + Math.random() * 900)}`,
    address: payload.address || "DSATM Campus, Kanakapura Road",
    capacity: Number(payload.capacity) || 300,
    status: payload.status || "ACTIVE",
    rooms: payload.rooms || [],
  };

  memoryCentres.push(newCentre);
  saveCentresToDisk();

  try {
    await supabaseAdmin.from("exam_centres").insert(newCentre);
  } catch (e) {}

  await logAuditEvent({
    userId: "examdept",
    userRole: "examdept",
    action: "EXAM_CENTRE_CREATED",
    entityType: "exam_centres",
    entityId: newCentre.id,
    newValue: `Centre: ${newCentre.name} (${newCentre.code}), Capacity: ${newCentre.capacity}`,
  });

  return newCentre;
}

/**
 * Add a room to an existing exam centre
 */
async function addRoomToCentre(centreId, roomPayload) {
  const centre = memoryCentres.find((c) => c.id === centreId);
  const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const newRoom = {
    id: roomId,
    building: roomPayload.building || "Main Block",
    floor: roomPayload.floor || "1st Floor",
    room_number: roomPayload.room_number || roomPayload.roomNumber || `LH-${Math.floor(100 + Math.random() * 800)}`,
    capacity: Number(roomPayload.capacity) || 40,
    status: roomPayload.status || "ACTIVE",
  };

  if (centre) {
    if (!Array.isArray(centre.rooms)) centre.rooms = [];
    centre.rooms.push(newRoom);
    // Recalculate centre capacity as sum of room capacities
    const sumCap = centre.rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
    if (sumCap > centre.capacity) centre.capacity = sumCap;
    saveCentresToDisk();
  }

  try {
    await supabaseAdmin.from("exam_rooms").insert({ ...newRoom, centre_id: centreId });
  } catch (e) {}

  await logAuditEvent({
    userId: "examdept",
    userRole: "examdept",
    action: "EXAM_ROOM_ADDED",
    entityType: "exam_rooms",
    entityId: roomId,
    newValue: `Centre: ${centre?.name || centreId}, Room: ${newRoom.room_number}, Capacity: ${newRoom.capacity}`,
  });

  return { centre, room: newRoom };
}

/**
 * Allocate student to centre & room with capacity check
 */
async function allocateStudentToRoom({ examId, studentId, centreId, roomId }) {
  const centre = memoryCentres.find((c) => c.id === centreId);
  const room = centre?.rooms?.find((r) => r.id === roomId) || memoryCentres[0].rooms[0];

  // Count existing allocations for this room
  const currentRoomAllocations = memoryAllocations.filter((a) => a.room_id === room.id && a.exam_id === examId);
  if (currentRoomAllocations.length >= room.capacity) {
    throw new Error(`Room capacity exceeded! Room ${room.room_number} has max capacity of ${room.capacity} seats.`);
  }

  const seatNo = currentRoomAllocations.length + 1;
  const allocation = {
    id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    exam_id: examId,
    student_id: studentId,
    centre_id: centre?.id || memoryCentres[0].id,
    room_id: room.id,
    centre_name: centre?.name || memoryCentres[0].name,
    room_number: room.room_number,
    seat_number: `SEAT-${seatNo < 10 ? '0' + seatNo : seatNo}`,
    allocated_at: new Date().toISOString(),
  };

  const existingIdx = memoryAllocations.findIndex((a) => a.exam_id === examId && a.student_id === studentId);
  if (existingIdx !== -1) memoryAllocations[existingIdx] = allocation;
  else memoryAllocations.push(allocation);

  saveCentresToDisk();
  return allocation;
}

/**
 * Generate & Publish Hall Ticket for a student
 */
async function generateAndPublishHallTicket({ studentId, examId, status = "PUBLISHED", authorId, timetable }) {
  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, registration_no, email, semester, department_id, departments!profiles_department_fk(name)")
    .eq("id", studentId)
    .maybeSingle();

  const { data: exam } = await supabaseAdmin
    .from("exams")
    .select("id, title, created_at, subject_id, subjects(name, code)")
    .eq("id", examId)
    .maybeSingle();

  let alloc = memoryAllocations.find((a) => a.student_id === studentId && (a.exam_id === examId || !examId));
  if (!alloc) {
    const activeCentre = memoryCentres[0];
    const activeRoom = activeCentre?.rooms?.[0];
    alloc = {
      centre_name: activeCentre?.name || "DSATM Main Academic Block Examination Centre",
      room_number: activeRoom ? `Room ${activeRoom.room_number} (${activeRoom.building || 'Block A'}, ${activeRoom.floor || '1st Floor'})` : "LH-101 (1st Floor)",
      seat_number: "SEAT-01",
    };
  }

  const ticketId = `ht-${studentId}-${examId}`;

function resolveSubjectIdFromEntry(entry) {
  if (!entry) return null;
  if (entry.subjectId) return entry.subjectId;
  if (entry.subject_id) return entry.subject_id;
  const code = String(entry.subjectCode || entry.code || "").toUpperCase();
  const name = String(entry.subjectName || entry.name || "").toLowerCase();

  if (code.includes("MMC335") || name.includes("devops")) return "004df87a-c02a-4296-bed5-51d8bd0fe371";
  if (code.includes("MMC333") || name.includes("web development")) return "b76fa471-11e9-4b91-9281-93200ff8d6e7";
  if (code.includes("MMC312") || name.includes("ethical hacking")) return "9d4b7294-a0d0-4c39-acb3-93e01d818cb3";
  if (code.includes("MMC321") || name.includes("deep learning")) return "f1c125fa-ca62-44a8-9e88-1c96c0fa9358";
  if (code.includes("MMC316") || name.includes("software design")) return "711130b8-e26e-424b-800e-957637a05662";

  return null;
}

  // Requirement: Filter timetable strictly to student's enrolled/registered subjects
  const { getEnrolledSubjectIdsForStudent } = require("./enrollmentStore");
  const enrolledSubjectIds = getEnrolledSubjectIdsForStudent(studentId);

  let resolvedTimetable = timetable;
  if (!resolvedTimetable || resolvedTimetable.length === 0) {
    try {
      const { getExamSchedules } = require("./examScheduleStore");
      let pubSchedules = await getExamSchedules({
        departmentId: student?.department_id,
        semester: student?.semester,
        status: "PUBLISHED",
      });

      if (enrolledSubjectIds && enrolledSubjectIds.length > 0) {
        const filteredByEnrollment = pubSchedules.filter((sc) =>
          enrolledSubjectIds.includes(sc.subjectId) || enrolledSubjectIds.includes(sc.subject_id)
        );
        if (filteredByEnrollment.length > 0) {
          pubSchedules = filteredByEnrollment;
        }
      }

      if (pubSchedules.length > 0) {
        resolvedTimetable = pubSchedules.map((sc) => ({
          subjectId: sc.subjectId || sc.subject_id,
          subjectCode: sc.subjectCode,
          subjectName: sc.subjectName,
          examDate: sc.examDate,
          timeSlot: `${sc.startTime} - ${sc.endTime}`,
        }));
      }
    } catch (e) {}
  }

  if (enrolledSubjectIds && enrolledSubjectIds.length > 0 && Array.isArray(resolvedTimetable)) {
    const filteredRows = resolvedTimetable.filter((entry) => {
      const subId = resolveSubjectIdFromEntry(entry);
      return subId ? enrolledSubjectIds.includes(subId) : false;
    });
    if (filteredRows.length > 0) {
      resolvedTimetable = filteredRows;
    }
  }

  const hallTicket = {
    id: ticketId,
    student_id: studentId,
    exam_id: examId,
    institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
    student_name: student?.full_name || "Student",
    registration_no: student?.registration_no || "1DS23MCA001",
    department_name: student?.departments?.name || "Department of Master of Computer Applications (MCA)",
    semester: student?.semester || "3rd Sem",
    academic_year: "2025–2026",
    exam_title: exam?.title || "Main Semester Examination 2026",
    subject_code: exam?.subjects?.code || "MMC321",
    subject_name: exam?.subjects?.name || "Main Examination Subject",
    exam_date: exam?.created_at ? new Date(exam.created_at).toLocaleDateString("en-GB") : "Scheduled",
    exam_time: "09:30 AM - 12:30 PM",
    centre_name: alloc.centre_name,
    room_number: alloc.room_number,
    seat_number: alloc.seat_number,
    timetable: resolvedTimetable || null,
    status, // "NOT_GENERATED", "GENERATED", "VERIFIED", "PUBLISHED"
    created_at: new Date().toISOString(),
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
  };

  const idx = memoryHallTickets.findIndex((ht) => ht.student_id === studentId && ht.exam_id === examId);
  if (idx !== -1) memoryHallTickets[idx] = hallTicket;
  else memoryHallTickets.unshift(hallTicket);

  saveCentresToDisk();

  try {
    await supabaseAdmin.from("hall_tickets").upsert(hallTicket, { onConflict: "student_id,exam_id" });
  } catch (e) {}

  await logAuditEvent({
    userId: authorId || "examdept",
    userRole: "examdept",
    action: "HALL_TICKET_PUBLISHED",
    entityType: "hall_tickets",
    entityId: ticketId,
    newValue: `Student: ${hallTicket.student_name} (${hallTicket.registration_no}), Status: ${status}`,
  });

  // Requirement 8B & 8C: Email Student upon Hall Ticket Publication
  let studentEmailResult = null;
  if (status === "PUBLISHED") {
    const studentEmail = student?.email;
    const studentName = student?.full_name || hallTicket.student_name;
    const regNo = student?.registration_no || hallTicket.registration_no;
    const deptName = hallTicket.department_name;
    const sem = hallTicket.semester;

    if (!studentEmail || !studentEmail.includes("@")) {
      const warnMsg = `⚠️ Warning: Student ${studentName} (${regNo}) has no valid registered email in database. Hall ticket published, but email notification skipped.`;
      console.warn(`[NOTIF WARNING] ${warnMsg}`);
      hallTicket.emailWarning = warnMsg;
      studentEmailResult = { warning: warnMsg };
    } else {
      const notifKey = `notif-ht-${studentId}-${examId}`;
      const { createNotificationLog, isDuplicateNotifSent } = require("./notificationLogStore");
      const { sendEmail, notify } = require("./notification.service");

      if (isDuplicateNotifSent(studentEmail, "HALL_TICKET_PUBLISHED", notifKey)) {
        console.log(`[NOTIF IDEMPOTENT] Student hall ticket email already sent to ${studentEmail} for ${regNo}.`);
        studentEmailResult = { skipped: true, recipient: studentEmail };
      } else {
        const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
        const emailSubject = `Your Main Examination Hall Ticket Is Now Available`;
        const emailBody = `Dear ${studentName},\n\n` +
          `Your Official Main Examination Admission Ticket / Hall Ticket for ${deptName} (${sem}) has been published by the Examination Control Authority.\n\n` +
          `📌 Candidate Name: ${studentName}\n` +
          `🎟️ Register No / USN: ${regNo}\n` +
          `🏛️ Department: ${deptName}\n` +
          `🎓 Semester: ${sem}\n` +
          `📍 Examination Centre: ${hallTicket.centre_name} (${hallTicket.room_number})\n` +
          `🪑 Seat Number: ${hallTicket.seat_number}\n\n` +
          `Please log in to your Student LMS Portal to view and download your official Admission Ticket PDF:\n` +
          `${portalUrl}/student\n\n` +
          `Best of luck for your examinations!\n\n` +
          `Regards,\n` +
          `DSATM Examination Control Authority`;

        let delStatus = "SENT";
        let failReason = null;

        try {
          await sendEmail(studentEmail, emailSubject, emailBody);
          await notify(studentId, "hall_ticket_published", emailSubject, emailBody, examId);
        } catch (err) {
          delStatus = "FAILED";
          failReason = err.message;
        }

        await createNotificationLog({
          id: notifKey,
          student_id: studentId,
          channel: "EMAIL",
          notification_type: "HALL_TICKET_PUBLISHED",
          recipient: studentEmail,
          subject: emailSubject,
          message: emailBody,
          status: delStatus,
          failure_reason: failReason,
          associated_id: notifKey,
        });

        studentEmailResult = { recipient: studentEmail, status: delStatus, failureReason: failReason };
      }
    }
  }

  return { hallTicket, studentEmailNotification: studentEmailResult };
}

/**
 * Fetch hall ticket for student
 */
async function getStudentHallTicket(studentId) {
  let dbTicket = null;
  try {
    const { data } = await supabaseAdmin
      .from("hall_tickets")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "PUBLISHED")
      .maybeSingle();
    dbTicket = data;
  } catch (e) {}

  let ticket = dbTicket || memoryHallTickets.find((ht) => ht.student_id === studentId && ht.status === "PUBLISHED");
  if (!ticket) return null;

  const { getEnrolledSubjectIdsForStudent } = require("./enrollmentStore");
  const enrolledSubjectIds = getEnrolledSubjectIdsForStudent(studentId);

  if ((!ticket.timetable || ticket.timetable.length === 0) && enrolledSubjectIds.length > 0) {
    try {
      const { getExamSchedules } = require("./examScheduleStore");
      let pubSchedules = await getExamSchedules({ status: "PUBLISHED" });
      const filteredByEnrollment = pubSchedules.filter((sc) => {
        const sId = resolveSubjectIdFromEntry(sc);
        return sId ? enrolledSubjectIds.includes(sId) : false;
      });
      if (filteredByEnrollment.length > 0) {
        ticket.timetable = filteredByEnrollment.map((sc) => ({
          subjectId: sc.subjectId || sc.subject_id,
          subjectCode: sc.subjectCode || sc.code,
          subjectName: sc.subjectName || sc.name,
          examDate: sc.examDate || sc.date,
          timeSlot: `${sc.startTime || '09:30 AM'} - ${sc.endTime || '12:30 PM'}`,
        }));
      }
    } catch (e) {}
  }

  return ticket;
}

async function getAllHallTickets() {
  let dbTickets = [];
  try {
    const { data } = await supabaseAdmin.from("hall_tickets").select("*");
    if (data && data.length > 0) dbTickets = data;
  } catch (e) {}
  return dbTickets.length > 0 ? dbTickets : memoryHallTickets;
}

async function deleteExamCentre(centreId) {
  const idx = memoryCentres.findIndex((c) => c.id === centreId);
  if (idx !== -1) {
    memoryCentres.splice(idx, 1);
    saveCentresToDisk();
  }
  try {
    await supabaseAdmin.from("exam_centres").delete().eq("id", centreId);
  } catch (e) {}
  return { success: true, centreId };
}

async function deleteRoomFromCentre(centreId, roomId) {
  const centre = memoryCentres.find((c) => c.id === centreId);
  if (centre && Array.isArray(centre.rooms)) {
    const rIdx = centre.rooms.findIndex((r) => r.id === roomId);
    if (rIdx !== -1) {
      centre.rooms.splice(rIdx, 1);
      const sumCap = centre.rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
      centre.capacity = sumCap;
      saveCentresToDisk();
    }
  }
  try {
    await supabaseAdmin.from("exam_rooms").delete().eq("id", roomId);
  } catch (e) {}
  return { success: true, centreId, roomId };
}

function resetStudentHallTicket(studentId) {
  if (!studentId) return;
  const filtered = memoryHallTickets.filter((ht) => ht.student_id !== studentId && ht.studentId !== studentId);
  memoryHallTickets.length = 0;
  memoryHallTickets.push(...filtered);
  saveCentresToDisk();
}

module.exports = {
  getExamCentres,
  createExamCentre,
  addRoomToCentre,
  deleteExamCentre,
  deleteRoomFromCentre,
  allocateStudentToRoom,
  generateAndPublishHallTicket,
  getStudentHallTicket,
  getAllHallTickets,
  resetStudentHallTicket,
};

