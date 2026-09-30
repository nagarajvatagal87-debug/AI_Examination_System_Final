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

  return newCentre;
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
async function generateAndPublishHallTicket({ studentId, examId, status = "PUBLISHED", authorId }) {
  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, registration_no, semester, department_id, departments(name)")
    .eq("id", studentId)
    .maybeSingle();

  const { data: exam } = await supabaseAdmin
    .from("exams")
    .select("id, title, created_at, subject_id, subjects(name, code)")
    .eq("id", examId)
    .maybeSingle();

  const alloc = memoryAllocations.find((a) => a.student_id === studentId && a.exam_id === examId) || {
    centre_name: memoryCentres[0].name,
    room_number: memoryCentres[0].rooms[0].room_number,
    seat_number: "SEAT-01",
  };

  const ticketId = `ht-${studentId}-${examId}`;

  const hallTicket = {
    id: ticketId,
    student_id: studentId,
    exam_id: examId,
    institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
    student_name: student?.full_name || "Student",
    registration_no: student?.registration_no || "1DS23MCA001",
    department_name: student?.departments?.name || "Department",
    semester: student?.semester || "3rd Sem",
    academic_year: "2025–2026",
    exam_title: exam?.title || "Main Examination 2026",
    subject_code: exam?.subjects?.code || "MMC321",
    subject_name: exam?.subjects?.name || "Main Examination Subject",
    exam_date: exam?.created_at ? new Date(exam.created_at).toLocaleDateString() : "Scheduled",
    exam_time: "09:30 AM - 12:30 PM",
    centre_name: alloc.centre_name,
    room_number: alloc.room_number,
    seat_number: alloc.seat_number,
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
    newValue: `Student: ${hallTicket.student_name} (${hallTicket.registration_no})`,
  });

  return hallTicket;
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

  if (dbTicket) return dbTicket;

  const memory = memoryHallTickets.find((ht) => ht.student_id === studentId && ht.status === "PUBLISHED");
  return memory || null;
}

module.exports = {
  getExamCentres,
  createExamCentre,
  allocateStudentToRoom,
  generateAndPublishHallTicket,
  getStudentHallTicket,
};
