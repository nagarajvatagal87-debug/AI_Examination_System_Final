const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const CALENDAR_FILE = path.join(__dirname, "../../persistent_academic_calendar.json");
const memoryCalendarEvents = [];

// Load persistent calendar events on startup
try {
  if (fs.existsSync(CALENDAR_FILE)) {
    const raw = fs.readFileSync(CALENDAR_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCalendarEvents.push(...parsed);
    }
    console.log(`Loaded ${memoryCalendarEvents.length} persistent calendar events from disk.`);
  }
} catch (e) {
  console.warn("Failed to load academic calendar file:", e.message);
}

function saveCalendarToDisk() {
  try {
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(memoryCalendarEvents, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save academic calendar to disk:", e.message);
  }
}

async function getAcademicCalendarEvents({ departmentId, semester, role, userId }) {
  let dbEvents = [];
  try {
    let query = supabaseAdmin
      .from("academic_calendar_events")
      .select("*, subjects(name, code), profiles:created_by(full_name)")
      .order("start_datetime", { ascending: true });

    if (departmentId) {
      query = query.or(`department_id.eq.${departmentId},visibility.eq.all,visibility.eq.institution`);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbEvents = data;
    }
  } catch (e) {}

  if (dbEvents.length > 0) {
    return dbEvents;
  }

  // Fallback memory list
  let events = memoryCalendarEvents;
  if (departmentId) {
    events = events.filter((ev) => !ev.department_id || ev.department_id === departmentId || ev.visibility === "all" || ev.visibility === "institution");
  }
  if (semester) {
    events = events.filter((ev) => !ev.semester || ev.semester === semester);
  }

  return events;
}

async function createAcademicCalendarEvent(eventPayload) {
  let startIso = new Date().toISOString();
  try {
    if (eventPayload.start_datetime) {
      const rawDate = eventPayload.start_datetime;
      if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split('-');
        startIso = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
      } else {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) startIso = d.toISOString();
      }
    }
  } catch (e) {}

  const newEvent = {
    id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: eventPayload.title,
    description: eventPayload.description || "",
    event_type: eventPayload.event_type || "Academic Event",
    department_id: eventPayload.department_id || null,
    subject_id: eventPayload.subject_id || null,
    semester: eventPayload.semester || null,
    section: eventPayload.section || null,
    start_datetime: startIso,
    end_datetime: startIso,
    created_by: eventPayload.created_by || null,
    visibility: eventPayload.visibility || "department",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryCalendarEvents.push(newEvent);
  saveCalendarToDisk();

  try {
    await supabaseAdmin.from("academic_calendar_events").insert(newEvent);
  } catch (e) {}

  return newEvent;
}

async function deleteAcademicCalendarEvent(eventId, departmentId) {
  const index = memoryCalendarEvents.findIndex((ev) => ev.id === eventId);
  if (index !== -1) {
    memoryCalendarEvents.splice(index, 1);
    saveCalendarToDisk();
  }

  try {
    await supabaseAdmin.from("academic_calendar_events").delete().eq("id", eventId);
  } catch (e) {}

  return true;
}

module.exports = {
  getAcademicCalendarEvents,
  createAcademicCalendarEvent,
  deleteAcademicCalendarEvent,
};
