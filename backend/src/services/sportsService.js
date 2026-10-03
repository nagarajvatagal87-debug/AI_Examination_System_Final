const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");
const { notify, sendEmail } = require("./notification.service");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const MASTER_FILE = path.join(DATA_DIR, "persistent_sports_master.json");
const EVENTS_FILE = path.join(DATA_DIR, "persistent_sports_events.json");
const REGISTRATIONS_FILE = path.join(DATA_DIR, "persistent_sports_registrations.json");
const TEAMS_FILE = path.join(DATA_DIR, "persistent_sports_teams.json");
const RESULTS_FILE = path.join(DATA_DIR, "persistent_sports_results.json");
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, "persistent_sports_achievements.json");
const NOTIF_LOG_FILE = path.join(DATA_DIR, "persistent_sports_notif_logs.json");

let memoryMaster = [];
let memoryEvents = [];
let memoryRegistrations = [];
let memoryTeams = [];
let memoryResults = [];
let memoryAchievements = [];
let memoryNotifLogs = [];

// Helper to load file safely
function loadJsonFile(filePath, defaultData = []) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultData;
    }
  } catch (e) {
    console.warn(`Failed to read ${filePath}:`, e.message);
  }
  return defaultData;
}

// Helper to save file safely
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn(`Failed to save ${filePath}:`, e.message);
  }
}

// Load all persistent sports data on startup
memoryMaster = loadJsonFile(MASTER_FILE, []);
memoryEvents = loadJsonFile(EVENTS_FILE, []);
memoryRegistrations = loadJsonFile(REGISTRATIONS_FILE, []);
memoryTeams = loadJsonFile(TEAMS_FILE, []);
memoryResults = loadJsonFile(RESULTS_FILE, []);
memoryAchievements = loadJsonFile(ACHIEVEMENTS_FILE, []);
memoryNotifLogs = loadJsonFile(NOTIF_LOG_FILE, []);

// Initial Seed Data for Sports Master Categories (Baseline Master Data only)
const SEED_SPORTS_MASTER = [
  { id: "sport-cricket", name: "Cricket", description: "Outdoor team sport with 11 players per team", type: "TEAM", status: "ACTIVE", icon: "🏏" },
  { id: "sport-football", name: "Football", description: "Outdoor team sport with 11 players per team", type: "TEAM", status: "ACTIVE", icon: "⚽" },
  { id: "sport-volleyball", name: "Volleyball", description: "Court team sport with 6 players per team", type: "TEAM", status: "ACTIVE", icon: "🏐" },
  { id: "sport-basketball", name: "Basketball", description: "Court team sport with 5 players per team", type: "TEAM", status: "ACTIVE", icon: "🏀" },
  { id: "sport-kabaddi", name: "Kabaddi", description: "Traditional contact team sport", type: "TEAM", status: "ACTIVE", icon: "🤼" },
  { id: "sport-badminton", name: "Badminton", description: "Racquet sport available in singles or doubles", type: "INDIVIDUAL", status: "ACTIVE", icon: "🏸" },
  { id: "sport-tabletennis", name: "Table Tennis", description: "Indoor table racquet sport", type: "INDIVIDUAL", status: "ACTIVE", icon: "🏓" },
  { id: "sport-tennis", name: "Tennis", description: "Lawn tennis singles or doubles match", type: "INDIVIDUAL", status: "ACTIVE", icon: "🎾" },
  { id: "sport-chess", name: "Chess", description: "Strategic board game tournament", type: "INDIVIDUAL", status: "ACTIVE", icon: "♟️" },
  { id: "sport-athletics", name: "Athletics", description: "Track & field events (100m, 400m, Long Jump, Relay)", type: "INDIVIDUAL", status: "ACTIVE", icon: "🏃" },
];

function initSportsMasterSeed() {
  if (memoryMaster.length === 0) {
    memoryMaster = [...SEED_SPORTS_MASTER];
    saveJsonFile(MASTER_FILE, memoryMaster);
  } else {
    let added = 0;
    for (const seed of SEED_SPORTS_MASTER) {
      if (!memoryMaster.some((s) => s.id === seed.id || s.name.toLowerCase() === seed.name.toLowerCase())) {
        memoryMaster.push(seed);
        added++;
      }
    }
    if (added > 0) saveJsonFile(MASTER_FILE, memoryMaster);
  }
}

initSportsMasterSeed();

// ---------------------------------------------------------------------------
// 1. SPORTS MASTER DATA MANAGEMENT & FACULTY LOOKUP
// ---------------------------------------------------------------------------
async function getDepartmentFaculty(departmentId = null) {
  try {
    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, department_id, departments!profiles_department_fk(id, name)")
      .in("role", ["faculty", "hod"]);

    if (departmentId && departmentId !== "ALL") {
      const { data: depts } = await supabaseAdmin.from("departments").select("id, name");
      const matchedDept = (depts || []).find(
        (d) =>
          String(d.id).toLowerCase() === String(departmentId).toLowerCase() ||
          String(d.name).toLowerCase() === String(departmentId).toLowerCase() ||
          (d.name && d.name.toLowerCase().includes(String(departmentId).toLowerCase()))
      );

      if (matchedDept) {
        query = query.eq("department_id", matchedDept.id);
      } else {
        query = query.eq("department_id", departmentId);
      }
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((f) => ({
        id: f.id,
        full_name: f.full_name || f.email,
        email: f.email,
        department_id: f.departments?.name || "MCA",
        designation: f.role === "hod" ? "HOD" : "Faculty Coordinator",
      }));
    }
  } catch (e) {
    console.error("Error in getDepartmentFaculty:", e);
  }

  // Fallback: fetch all real database faculty & HOD profiles without dummy names
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, department_id, departments!profiles_department_fk(id, name)")
      .in("role", ["faculty", "hod"]);
    if (data && data.length > 0) {
      return data.map((f) => ({
        id: f.id,
        full_name: f.full_name || f.email,
        email: f.email,
        department_id: f.departments?.name || "MCA",
        designation: f.role === "hod" ? "HOD" : "Faculty Coordinator",
      }));
    }
  } catch (e) {}

  return [];
}

async function getSportsMaster() {
  return memoryMaster.filter((s) => s.status === "ACTIVE");
}

async function getAllSportsMaster() {
  return memoryMaster;
}

async function createSportsMaster(payload) {
  if (!payload.name || !payload.name.trim()) throw new Error("Sport name is required.");
  
  const existing = memoryMaster.find((s) => s.name.toLowerCase() === payload.name.trim().toLowerCase());
  if (existing) throw new Error(`Sport "${payload.name}" already exists in Master Data.`);

  const newSport = {
    id: `sport-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: payload.name.trim(),
    description: payload.description || "",
    type: payload.type === "TEAM" ? "TEAM" : "INDIVIDUAL",
    status: payload.status || "ACTIVE",
    icon: payload.icon || "🏆",
    created_at: new Date().toISOString(),
  };

  memoryMaster.push(newSport);
  saveJsonFile(MASTER_FILE, memoryMaster);

  try {
    await supabaseAdmin.from("sports_master").insert(newSport);
  } catch (e) {}

  return newSport;
}

async function updateSportsMaster(sportId, payload) {
  const index = memoryMaster.findIndex((s) => s.id === sportId);
  if (index === -1) throw new Error("Sport not found in Master Data.");

  const updated = {
    ...memoryMaster[index],
    name: payload.name !== undefined ? payload.name.trim() : memoryMaster[index].name,
    description: payload.description !== undefined ? payload.description : memoryMaster[index].description,
    type: payload.type || memoryMaster[index].type,
    status: payload.status || memoryMaster[index].status,
    icon: payload.icon || memoryMaster[index].icon,
    updated_at: new Date().toISOString(),
  };

  memoryMaster[index] = updated;
  saveJsonFile(MASTER_FILE, memoryMaster);

  try {
    await supabaseAdmin.from("sports_master").update(updated).eq("id", sportId);
  } catch (e) {}

  return updated;
}

// ---------------------------------------------------------------------------
// 2. VENUE CONFLICT CHECKER
// ---------------------------------------------------------------------------
function checkVenueConflict(venue, eventDate, startTime, endTime, excludeEventId = null) {
  if (!venue || !eventDate) return null;

  const conflictingEvent = memoryEvents.find((e) => {
    if (e.id === excludeEventId) return false;
    if (e.status === "CANCELLED" || e.status === "COMPLETED") return false;

    const sameVenue = e.venue && e.venue.trim().toLowerCase() === venue.trim().toLowerCase();
    const sameDate = e.event_date === eventDate;

    if (!sameVenue || !sameDate) return false;

    // Time overlap check if times provided
    if (startTime && endTime && e.start_time && e.end_time) {
      if (startTime <= e.end_time && endTime >= e.start_time) return true;
    }
    return true; // Default match on same venue & date
  });

  return conflictingEvent || null;
}

// ---------------------------------------------------------------------------
// 3. SPORTS EVENT MANAGEMENT
// ---------------------------------------------------------------------------
async function getSportsEvents({
  eventLevel = null,
  departmentId = null,
  sportId = null,
  status = null,
  studentId = null,
  search = null,
  role = "student",
  assignedFacultyId = null,
  userId = null,
} = {}) {
  let events = [...memoryEvents];

  // Try DB fetch if available
  try {
    const { data, error } = await supabaseAdmin.from("sports_events").select("*").order("event_date", { ascending: true });
    if (!error && data && data.length > 0) events = data;
  } catch (e) {}

  // Filter by Role & Status
  events = events.filter((ev) => {
    if (assignedFacultyId) {
      const isAssigned = ev.assigned_faculty_id === assignedFacultyId || ev.created_by === assignedFacultyId;
      if (!isAssigned) return false;
    }

    if (role === "student") {
      // Students see published events only
      if (ev.status === "DRAFT" || ev.status === "ASSIGNED" || ev.status === "PENDING_APPROVAL") return false;
    } else if (role === "faculty") {
      // Faculty see published events + events assigned to them or created by them
      const isAssigned = (userId && ev.assigned_faculty_id === userId) || (userId && ev.created_by === userId);
      if (!isAssigned && (ev.status === "DRAFT" || ev.status === "ASSIGNED" || ev.status === "PENDING_APPROVAL")) {
        return false;
      }
    }

    if (eventLevel && ev.event_level !== eventLevel) return false;

    if (departmentId && ev.department_id) {
      const isCollegeLevel = ev.event_level === "COLLEGE";
      const isSameDept = String(ev.department_id).toLowerCase() === String(departmentId).toLowerCase();
      const isEligibleDept = Array.isArray(ev.eligible_department_ids) &&
        ev.eligible_department_ids.some(id => String(id).toLowerCase() === String(departmentId).toLowerCase());
      
      if (!isCollegeLevel && !isSameDept && !isEligibleDept) return false;
    }

    if (sportId && ev.sport_id !== sportId) return false;

    if (status && ev.status !== status) return false;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = (ev.event_name || "").toLowerCase().includes(q);
      const matchSport = (ev.sport_name || "").toLowerCase().includes(q);
      const matchVenue = (ev.venue || "").toLowerCase().includes(q);
      if (!matchName && !matchSport && !matchVenue) return false;
    }

    return true;
  });

  // Calculate dynamic statistics per event
  const enriched = events.map((ev) => {
    const eventRegs = memoryRegistrations.filter((r) => r.event_id === ev.id && r.status !== "CANCELLED");
    const isRegistered = studentId ? eventRegs.some((r) => r.student_id === studentId) : false;
    
    // Auto calculate if registration open/closed
    let calculatedStatus = ev.status || "PUBLISHED";
    if (calculatedStatus === "PUBLISHED" || calculatedStatus === "REGISTRATION_OPEN") {
      if (ev.max_participants && eventRegs.length >= ev.max_participants) {
        calculatedStatus = "REGISTRATION_CLOSED";
      } else {
        calculatedStatus = "REGISTRATION_OPEN";
      }
    }

    return {
      ...ev,
      registered_count: eventRegs.length,
      is_full: ev.max_participants ? eventRegs.length >= ev.max_participants : false,
      is_student_registered: isRegistered,
      status: calculatedStatus,
    };
  });

  enriched.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  return enriched;
}

async function getSportsEventById(eventId, studentId = null) {
  let ev = memoryEvents.find((e) => e.id === eventId);
  if (!ev) {
    try {
      const { data } = await supabaseAdmin.from("sports_events").select("*").eq("id", eventId).single();
      if (data) ev = data;
    } catch (e) {}
  }
  if (!ev) return null;

  const registrations = memoryRegistrations.filter((r) => r.event_id === eventId && r.status !== "CANCELLED");
  const teams = memoryTeams.filter((t) => t.event_id === eventId);
  const result = memoryResults.find((res) => res.event_id === eventId);
  const isRegistered = studentId ? registrations.some((r) => r.student_id === studentId) : false;

  return {
    ...ev,
    registered_count: registrations.length,
    is_student_registered: isRegistered,
    registrations,
    teams,
    result: result || null,
  };
}

async function createSportsEvent(payload, userPayload = {}) {
  if (!payload.event_name || !payload.event_name.trim()) throw new Error("Event name is required.");
  if (!payload.sport_id) throw new Error("Sport selection is required.");

  const sportObj = memoryMaster.find((s) => s.id === payload.sport_id || s.name.toLowerCase() === (payload.sport_name || "").toLowerCase());
  const sportName = sportObj ? sportObj.name : (payload.sport_name || "Sports");

  // Venue conflict check
  const conflict = checkVenueConflict(payload.venue, payload.event_date, payload.start_time, payload.end_time);

  const eventId = payload.id || `sports-ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();
  const assignedFacultyId = payload.assigned_faculty_id || null;
  const assignedFacultyName = payload.assigned_faculty_name || null;
  const defaultStatus = assignedFacultyId && payload.status !== "PUBLISHED" ? "ASSIGNED" : (payload.status || "PUBLISHED");

  const newEvent = {
    id: eventId,
    sport_id: payload.sport_id,
    sport_name: sportName,
    event_name: payload.event_name.trim(),
    event_level: payload.event_level || "DEPARTMENT", // COLLEGE or DEPARTMENT
    department_id: payload.event_level === "COLLEGE" ? null : (payload.department_id || "MCA"),
    eligible_department_ids: Array.isArray(payload.eligible_department_ids) ? payload.eligible_department_ids : [],
    assigned_faculty_id: assignedFacultyId,
    assigned_faculty_name: assignedFacultyName,
    academic_year: payload.academic_year || "2026-27",
    semester: payload.semester || "ALL",
    event_date: payload.event_date || now.split("T")[0],
    end_date: payload.end_date || payload.event_date || now.split("T")[0],
    start_time: payload.start_time || "09:00 AM",
    end_time: payload.end_time || "05:00 PM",
    venue: payload.venue || "DSATM Sports Ground",
    registration_start_date: payload.registration_start_date || now.split("T")[0],
    registration_end_date: payload.registration_end_date || payload.event_date || now.split("T")[0],
    max_participants: Number(payload.max_participants) || 60,
    team_size: Number(payload.team_size) || (sportObj && sportObj.type === "TEAM" ? 11 : 1),
    type: payload.type || (sportObj ? sportObj.type : "INDIVIDUAL"),
    description: payload.description || "",
    rules: payload.rules || "",
    eligibility_criteria: payload.eligibility_criteria || "All registered students in the eligible department/college.",
    status: defaultStatus,
    venue_conflict_warning: conflict ? `Conflict detected with event "${conflict.event_name}" at ${conflict.venue}` : null,
    created_by: userPayload.userId || "Coordinator",
    created_at: now,
    updated_at: now,
    published_at: defaultStatus === "PUBLISHED" ? now : null,
  };

  memoryEvents.push(newEvent);
  saveJsonFile(EVENTS_FILE, memoryEvents);

  // Try inserting into Supabase
  try {
    await supabaseAdmin.from("sports_events").insert(newEvent);
  } catch (e) {}

  // Log Audit Event
  try {
    await logAuditEvent({
      userId: userPayload.userId || "Coordinator",
      userRole: userPayload.userRole || "sports_coordinator",
      action: "SPORTS_EVENT_CREATED",
      entityType: "sports_events",
      entityId: newEvent.id,
      newValue: newEvent.event_name,
    });
  } catch (e) {}

  // If assigned to a specific faculty member, notify assigned faculty member
  if (assignedFacultyId && (newEvent.status === "ASSIGNED" || newEvent.status === "DRAFT")) {
    notify(
      assignedFacultyId,
      "sports",
      `🏆 Assigned Sports Event: ${newEvent.event_name}`,
      `You have been assigned to coordinate ${newEvent.event_name}. Please update event details and publish when ready.`
    ).catch(() => {});
  }

  // Auto-link to Academic Calendar & Notify Students ONLY if published
  if (newEvent.status === "PUBLISHED" || newEvent.status === "REGISTRATION_OPEN") {
    await linkSportsEventToAcademicCalendar(newEvent);
    await dispatchSportsNotifications(newEvent, "EVENT_PUBLISHED");
  }

  return newEvent;
}

async function updateSportsEvent(eventId, payload, userPayload = {}) {
  const index = memoryEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error("Sports event not found.");

  const oldEvent = { ...memoryEvents[index] };
  const now = new Date().toISOString();

  const conflict = checkVenueConflict(
    payload.venue || oldEvent.venue,
    payload.event_date || oldEvent.event_date,
    payload.start_time || oldEvent.start_time,
    payload.end_time || oldEvent.end_time,
    eventId
  );

  const updatedEvent = {
    ...oldEvent,
    event_name: payload.event_name !== undefined ? payload.event_name.trim() : oldEvent.event_name,
    event_level: payload.event_level || oldEvent.event_level,
    department_id: payload.event_level === "COLLEGE" ? null : (payload.department_id || oldEvent.department_id),
    eligible_department_ids: payload.eligible_department_ids || oldEvent.eligible_department_ids,
    assigned_faculty_id: payload.assigned_faculty_id !== undefined ? payload.assigned_faculty_id : oldEvent.assigned_faculty_id,
    assigned_faculty_name: payload.assigned_faculty_name !== undefined ? payload.assigned_faculty_name : oldEvent.assigned_faculty_name,
    academic_year: payload.academic_year || oldEvent.academic_year,
    semester: payload.semester || oldEvent.semester,
    event_date: payload.event_date || oldEvent.event_date,
    end_date: payload.end_date || oldEvent.end_date,
    start_time: payload.start_time || oldEvent.start_time,
    end_time: payload.end_time || oldEvent.end_time,
    venue: payload.venue || oldEvent.venue,
    registration_start_date: payload.registration_start_date || oldEvent.registration_start_date,
    registration_end_date: payload.registration_end_date || oldEvent.registration_end_date,
    max_participants: payload.max_participants !== undefined ? Number(payload.max_participants) : oldEvent.max_participants,
    team_size: payload.team_size !== undefined ? Number(payload.team_size) : oldEvent.team_size,
    type: payload.type || oldEvent.type,
    description: payload.description !== undefined ? payload.description : oldEvent.description,
    rules: payload.rules !== undefined ? payload.rules : oldEvent.rules,
    eligibility_criteria: payload.eligibility_criteria !== undefined ? payload.eligibility_criteria : oldEvent.eligibility_criteria,
    status: payload.status || oldEvent.status,
    published_at: (payload.status === "PUBLISHED" && oldEvent.status !== "PUBLISHED") ? now : oldEvent.published_at,
    venue_conflict_warning: conflict ? `Conflict detected with event "${conflict.event_name}" at ${conflict.venue}` : null,
    updated_at: now,
  };

  memoryEvents[index] = updatedEvent;
  saveJsonFile(EVENTS_FILE, memoryEvents);

  try {
    await supabaseAdmin.from("sports_events").update(updatedEvent).eq("id", eventId);
  } catch (e) {}

  // Audit log
  try {
    await logAuditEvent({
      userId: userPayload.userId || "Coordinator",
      userRole: userPayload.userRole || "sports_coordinator",
      action: "SPORTS_EVENT_UPDATED",
      entityType: "sports_events",
      entityId: eventId,
      newValue: updatedEvent.event_name,
    });
  } catch (e) {}

  if (oldEvent.status !== "PUBLISHED" && updatedEvent.status === "PUBLISHED") {
    await linkSportsEventToAcademicCalendar(updatedEvent);
    await dispatchSportsNotifications(updatedEvent, "EVENT_PUBLISHED");
  } else if (oldEvent.event_date !== updatedEvent.event_date || oldEvent.venue !== updatedEvent.venue) {
    await dispatchSportsNotifications(updatedEvent, "EVENT_UPDATED");
  }

  return updatedEvent;
}

async function publishSportsEvent(eventId, userPayload = {}) {
  return await updateSportsEvent(eventId, { status: "PUBLISHED" }, userPayload);
}

async function cancelSportsEvent(eventId, reason = "Cancelled by Sports Coordinator", userPayload = {}) {
  const index = memoryEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error("Sports event not found.");

  const oldEvent = memoryEvents[index];
  const updated = {
    ...oldEvent,
    status: "CANCELLED",
    rules: `CANCELLED: ${reason}`,
    updated_at: new Date().toISOString(),
  };

  memoryEvents[index] = updated;
  saveJsonFile(EVENTS_FILE, memoryEvents);

  try {
    await supabaseAdmin.from("sports_events").update({ status: "CANCELLED" }).eq("id", eventId);
  } catch (e) {}

  await dispatchSportsNotifications(updated, "EVENT_CANCELLED", { reason });
  return updated;
}

async function deleteSportsEvent(eventId) {
  const idx = memoryEvents.findIndex((e) => e.id === eventId);
  if (idx !== -1) {
    memoryEvents.splice(idx, 1);
    saveJsonFile(EVENTS_FILE, memoryEvents);
  }

  try {
    await supabaseAdmin.from("sports_events").delete().eq("id", eventId);
  } catch (e) {}

  return true;
}

// Helper: Link published Sports Event to Academic Calendar
async function linkSportsEventToAcademicCalendar(event) {
  try {
    const { createAcademicCalendarEvent } = require("./calendarService");
    await createAcademicCalendarEvent({
      id: `cal-sports-${event.id}`,
      title: `🏆 ${event.event_name}`,
      event_type: "STUDENT_ACTIVITY",
      department_id: event.department_id || "ALL",
      program: "ALL",
      semester: event.semester || "ALL",
      academic_year: event.academic_year || "2026-27",
      start_date: event.event_date,
      end_date: event.end_date || event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      description: `Sports Event (${event.event_level} Level): ${event.description || event.event_name}. Venue: ${event.venue}`,
      location: event.venue,
      audience: ["students", "faculty", "hod", "principal"],
      priority: "HIGH",
      status: "PUBLISHED",
    });
  } catch (e) {
    console.warn("Failed to auto-link sports event to academic calendar:", e.message);
  }
}

// ---------------------------------------------------------------------------
// 4. STUDENT REGISTRATION & CAPACITY MANAGEMENT
// ---------------------------------------------------------------------------
async function registerStudentForSports(eventId, studentId, studentInfo = {}) {
  const event = memoryEvents.find((e) => e.id === eventId);
  if (!event) throw new Error("Sports event not found.");

  // Check event status
  if (event.status === "CANCELLED" || event.status === "COMPLETED" || event.status === "DRAFT") {
    throw new Error(`Registration is not available for this event (Status: ${event.status}).`);
  }

  // Check Department / Eligibility
  if (event.event_level === "DEPARTMENT") {
    const studentDept = String(studentInfo.department_id || "MCA").toLowerCase();
    const eventDept = String(event.department_id || "MCA").toLowerCase();
    if (studentDept !== eventDept) {
      throw new Error(`This sports event is restricted to ${event.department_id || 'Department'} students only.`);
    }
  } else if (event.event_level === "COLLEGE" && Array.isArray(event.eligible_department_ids) && event.eligible_department_ids.length > 0) {
    const studentDept = String(studentInfo.department_id || "").toLowerCase();
    const isEligible = event.eligible_department_ids.some((id) => String(id).toLowerCase() === studentDept);
    if (!isEligible) {
      throw new Error("Your department is not eligible to register for this college-wide sports event.");
    }
  }

  // Check Duplicate Registration (Prevent duplicate registration!)
  const existingReg = memoryRegistrations.find(
    (r) => r.event_id === eventId && r.student_id === studentId && r.status !== "CANCELLED"
  );
  if (existingReg) {
    throw new Error("You are already registered for this sports event.");
  }

  // Capacity Management Check
  const activeRegs = memoryRegistrations.filter((r) => r.event_id === eventId && r.status !== "CANCELLED");
  if (event.max_participants && activeRegs.length >= event.max_participants) {
    // Automatically close registration if full
    event.status = "REGISTRATION_CLOSED";
    saveJsonFile(EVENTS_FILE, memoryEvents);
    throw new Error(`Registration is CLOSED. Maximum capacity of ${event.max_participants} players has been reached.`);
  }

  const registrationId = `sreg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const newReg = {
    id: registrationId,
    event_id: eventId,
    student_id: studentId,
    student_name: studentInfo.full_name || studentInfo.name || "Student Participant",
    usn: studentInfo.usn || studentInfo.registration_no || "1DT22MC000",
    department_id: studentInfo.department_id || event.department_id || "MCA",
    program: studentInfo.program || "MCA",
    semester: studentInfo.semester || "III",
    section: studentInfo.section || "A",
    team_id: null,
    team_name: null,
    status: "REGISTERED",
    registered_at: now,
  };

  memoryRegistrations.push(newReg);
  saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);

  try {
    await supabaseAdmin.from("sports_registrations").insert(newReg);
  } catch (e) {}

  // Check if now at capacity and close registration
  if (event.max_participants && activeRegs.length + 1 >= event.max_participants) {
    event.status = "REGISTRATION_CLOSED";
    saveJsonFile(EVENTS_FILE, memoryEvents);
  }

  // Log Audit Event
  try {
    await logAuditEvent({
      userId: studentId,
      userRole: "student",
      action: "SPORTS_REGISTRATION_CREATED",
      entityType: "sports_registrations",
      entityId: registrationId,
      newValue: `Registered for ${event.event_name}`,
    });
  } catch (e) {}

  return newReg;
}

async function cancelStudentRegistration(eventId, studentId) {
  const index = memoryRegistrations.findIndex(
    (r) => r.event_id === eventId && r.student_id === studentId && r.status !== "CANCELLED"
  );
  if (index === -1) throw new Error("Active registration not found.");

  memoryRegistrations[index].status = "CANCELLED";
  memoryRegistrations[index].cancelled_at = new Date().toISOString();
  saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);

  try {
    await supabaseAdmin.from("sports_registrations").update({ status: "CANCELLED" }).eq("id", memoryRegistrations[index].id);
  } catch (e) {}

  return true;
}

// ---------------------------------------------------------------------------
// 5. TEAM MANAGEMENT FOR TEAM-BASED SPORTS
// ---------------------------------------------------------------------------
async function createSportsTeam(eventId, payload) {
  const event = memoryEvents.find((e) => e.id === eventId);
  if (!event) throw new Error("Sports event not found.");

  if (!payload.team_name || !payload.team_name.trim()) throw new Error("Team name is required.");

  const teamId = `steam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const newTeam = {
    id: teamId,
    event_id: eventId,
    team_name: payload.team_name.trim(),
    captain_id: payload.captain_id || null,
    captain_name: payload.captain_name || null,
    member_ids: Array.isArray(payload.member_ids) ? payload.member_ids : [],
    members: Array.isArray(payload.members) ? payload.members : [],
    created_at: now,
  };

  memoryTeams.push(newTeam);
  saveJsonFile(TEAMS_FILE, memoryTeams);

  // Update registrations with team assignment
  if (Array.isArray(payload.member_ids)) {
    for (const memId of payload.member_ids) {
      const reg = memoryRegistrations.find((r) => r.event_id === eventId && r.student_id === memId);
      if (reg) {
        reg.team_id = teamId;
        reg.team_name = newTeam.team_name;
      }
    }
    saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);
  }

  // Notify team members
  if (Array.isArray(payload.member_ids)) {
    for (const memId of payload.member_ids) {
      notify(memId, "sports", `🏀 Team Assigned: ${newTeam.team_name}`, `You have been assigned to ${newTeam.team_name} for ${event.event_name}.`).catch(() => {});
    }
  }

  return newTeam;
}

async function getSportsTeams(eventId) {
  return memoryTeams.filter((t) => t.event_id === eventId);
}

// ---------------------------------------------------------------------------
// 6. SPORTS RESULTS & ACHIEVEMENTS INTEGRATION
// ---------------------------------------------------------------------------
async function publishSportsResult(eventId, payload, userPayload = {}) {
  const event = memoryEvents.find((e) => e.id === eventId);
  if (!event) throw new Error("Sports event not found.");

  const resultId = `sres-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const newResult = {
    id: resultId,
    event_id: eventId,
    event_name: event.event_name,
    sport_name: event.sport_name,
    event_level: event.event_level,
    department_id: event.department_id,
    winner: payload.winner || "Team A",
    winner_student_id: payload.winner_student_id || null,
    winner_details: payload.winner_details || "",
    runner_up: payload.runner_up || "Team B",
    runner_up_student_id: payload.runner_up_student_id || null,
    third_place: payload.third_place || null,
    score_details: payload.score_details || "",
    published_by: userPayload.userId || "Coordinator",
    published_at: now,
  };

  // Upsert result
  const idx = memoryResults.findIndex((r) => r.event_id === eventId);
  if (idx !== -1) memoryResults[idx] = newResult;
  else memoryResults.push(newResult);
  saveJsonFile(RESULTS_FILE, memoryResults);

  // Update Event Status to COMPLETED
  event.status = "COMPLETED";
  event.completed_at = now;
  saveJsonFile(EVENTS_FILE, memoryEvents);

  // Automatically Create / Link Achievement Record into Achievements System!
  const achievementRecord = {
    id: `ach-sports-${resultId}`,
    student_id: payload.winner_student_id || null,
    student_name: typeof payload.winner === 'string' ? payload.winner : 'Sports Winner',
    category: "Sports",
    sport_name: event.sport_name,
    event_name: event.event_name,
    event_level: event.event_level,
    department_id: event.department_id || "MCA",
    position: "Winner",
    academic_year: event.academic_year || "2026-27",
    achievement_title: `Winner - ${event.event_name} (${event.sport_name})`,
    description: `Secured 1st Place / Winner in ${event.event_name}. Scores: ${payload.score_details || 'Official Tournament Victory'}`,
    created_at: now,
  };

  const achIdx = memoryAchievements.findIndex((a) => a.id === achievementRecord.id);
  if (achIdx !== -1) memoryAchievements[achIdx] = achievementRecord;
  else memoryAchievements.push(achievementRecord);
  saveJsonFile(ACHIEVEMENTS_FILE, memoryAchievements);

  // Notify registered participants about published results
  await dispatchSportsNotifications(event, "RESULTS_PUBLISHED", { winner: payload.winner, scores: payload.score_details });

  return newResult;
}

async function getSportsAchievements({ studentId = null, departmentId = null } = {}) {
  let list = [...memoryAchievements];

  if (studentId) {
    list = list.filter((a) => a.student_id === studentId || (a.student_name && a.student_name.toLowerCase().includes(studentId.toLowerCase())));
  }

  if (departmentId) {
    list = list.filter((a) => !a.department_id || String(a.department_id).toLowerCase() === String(departmentId).toLowerCase());
  }

  return list;
}

// ---------------------------------------------------------------------------
// 7. NOTIFICATION & EMAIL DISPATCH SYSTEM
// ---------------------------------------------------------------------------
async function dispatchSportsNotifications(event, notifType, extra = {}) {
  try {
    const { data: users } = await supabaseAdmin.from("profiles").select("id, email, full_name, role, department_id");
    let recipients = users || [];

    if (event.event_level === "DEPARTMENT" && event.department_id) {
      recipients = recipients.filter((u) => u.department_id && String(u.department_id).toLowerCase() === String(event.department_id).toLowerCase());
    }

    const eventDateFormatted = new Date(event.event_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    for (const u of recipients) {
      if (u.role !== "student" && u.role !== "faculty" && u.role !== "hod") continue;

      const idempotencyKey = `${event.id}:${u.id}:${notifType}:${event.updated_at || event.created_at}`;
      if (memoryNotifLogs.some((l) => l.key === idempotencyKey)) continue;

      let notifTitle = `🏆 Sports Alert: ${event.event_name}`;
      let notifBody = `Sports Notice: ${event.event_name} (${event.sport_name}) is scheduled for ${eventDateFormatted} at ${event.venue}.`;
      let emailSubject = `🏆 DSATM Sports Notice: ${event.event_name}`;
      let emailContent = `Dear ${u.full_name || 'Student'},\n\nA new sports event has been published:\n\n📌 Event: ${event.event_name}\n🏷️ Sport: ${event.sport_name}\n📅 Date: ${eventDateFormatted}\n📍 Venue: ${event.venue}\n\nPlease check your Sports Portal on LMS to view details and register.\n\nBest Regards,\nSports Committee & Department MCA\nDSATM`;

      if (notifType === "RESULTS_PUBLISHED") {
        notifTitle = `🏆 Results Published: ${event.event_name}`;
        notifBody = `The results for ${event.event_name} have been published! Winner: ${extra.winner || 'Team A'}.`;
        emailSubject = `🏆 Sports Tournament Results: ${event.event_name}`;
        emailContent = `Dear ${u.full_name || 'Student'},\n\nResults for ${event.event_name} are now published:\n\n🥇 Winner: ${extra.winner || 'Team A'}\n📊 Details: ${extra.scores || 'Tournament Completed'}\n\nCongratulations to all participants!\n\nBest Regards,\nDSATM Sports Management`;
      } else if (notifType === "EVENT_CANCELLED") {
        notifTitle = `⚠️ CANCELLED: ${event.event_name}`;
        notifBody = `Official Notice: ${event.event_name} scheduled for ${eventDateFormatted} has been cancelled.`;
        emailSubject = `⚠️ Sports Event Cancelled: ${event.event_name}`;
        emailContent = `Dear ${u.full_name || 'Student'},\n\nPlease note that ${event.event_name} scheduled for ${eventDateFormatted} has been CANCELLED.\nReason: ${extra.reason || 'Administrative reschedule'}.\n\nRegards,\nDSATM Sports Management`;
      }

      notify(u.id, "sports", notifTitle, notifBody).catch(() => {});
      if (u.email) {
        sendEmail(u.email, emailSubject, emailContent).catch((e) => console.warn(`Sports email failed for ${u.email}:`, e.message));
      }

      memoryNotifLogs.push({
        id: `snotif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        key: idempotencyKey,
        event_id: event.id,
        user_id: u.id,
        user_email: u.email,
        type: notifType,
        sent_at: new Date().toISOString(),
      });
      saveJsonFile(NOTIF_LOG_FILE, memoryNotifLogs);
    }
  } catch (err) {
    console.warn("Sports notification dispatch warning:", err.message);
  }
}

// ---------------------------------------------------------------------------
// 8. REAL AGGREGATED STATS & DASHBOARD QUERIES
// ---------------------------------------------------------------------------
async function getSportsOverviewStats({ departmentId = null } = {}) {
  let events = [...memoryEvents];
  let regs = [...memoryRegistrations].filter((r) => r.status !== "CANCELLED");

  if (departmentId) {
    events = events.filter((e) => e.event_level === "DEPARTMENT" && String(e.department_id).toLowerCase() === String(departmentId).toLowerCase());
    regs = regs.filter((r) => String(r.department_id).toLowerCase() === String(departmentId).toLowerCase());
  }

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status === "PUBLISHED" || e.status === "REGISTRATION_OPEN").length;
  const completedEvents = events.filter((e) => e.status === "COMPLETED").length;
  const registeredStudents = regs.length;

  // Sports-wise counts
  const sportsBreakdown = {};
  for (const reg of regs) {
    const ev = events.find((e) => e.id === reg.event_id);
    const sName = ev ? ev.sport_name : "Other Sport";
    sportsBreakdown[sName] = (sportsBreakdown[sName] || 0) + 1;
  }

  // Department-wise counts (for College Sports Coordinator / Principal)
  const deptBreakdown = {};
  for (const reg of memoryRegistrations.filter((r) => r.status !== "CANCELLED")) {
    const dName = reg.department_id || "MCA";
    deptBreakdown[dName] = (deptBreakdown[dName] || 0) + 1;
  }

  return {
    total_events: totalEvents,
    upcoming_events: upcomingEvents,
    completed_events: completedEvents,
    registered_students: registeredStudents,
    sports_breakdown: sportsBreakdown,
    department_breakdown: deptBreakdown,
  };
}

module.exports = {
  getDepartmentFaculty,
  getSportsMaster,
  getAllSportsMaster,
  createSportsMaster,
  updateSportsMaster,
  getSportsEvents,
  getSportsEventById,
  createSportsEvent,
  updateSportsEvent,
  publishSportsEvent,
  cancelSportsEvent,
  deleteSportsEvent,
  registerStudentForSports,
  cancelStudentRegistration,
  createSportsTeam,
  getSportsTeams,
  publishSportsResult,
  getSportsAchievements,
  getSportsOverviewStats,
  checkVenueConflict,
};
