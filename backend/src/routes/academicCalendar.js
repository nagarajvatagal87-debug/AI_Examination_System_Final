const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { logAuditEvent } = require("../services/auditService.js");
const {
  getAcademicCalendarEvents,
  getAcademicCalendarEventById,
  createAcademicCalendarEvent,
  updateAcademicCalendarEvent,
  publishAcademicCalendarEvent,
  cancelAcademicCalendarEvent,
  deleteAcademicCalendarEvent,
  duplicateAcademicCalendarEvent,
  importAcademicCalendarEvents,
  OFFICIAL_MCA_SEED_EVENTS,
} = require("../services/calendarService.js");

const router = express.Router();

// Middleware: Optional or Required Auth based on route
// Public/Authenticated GET endpoint to list academic calendar events
router.get("/", async (req, res) => {
  try {
    const role = req.user?.role || "student";
    const userId = req.user?.id || null;

    const {
      departmentId,
      program,
      semester,
      academicYear,
      eventType,
      status,
      search,
      referenceDate,
    } = req.query;

    const events = await getAcademicCalendarEvents({
      departmentId,
      program,
      semester,
      academicYear,
      role,
      userId,
      eventType,
      status,
      search,
      referenceDate,
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch academic calendar events." });
  }
});

// GET /api/academic-calendar/holidays -> General holidays list
router.get("/holidays", async (req, res) => {
  try {
    const role = req.user?.role || "student";
    const { departmentId, referenceDate } = req.query;

    const events = await getAcademicCalendarEvents({
      departmentId,
      eventType: "GENERAL_HOLIDAY",
      role,
      referenceDate,
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch general holidays." });
  }
});

// GET /api/academic-calendar/upcoming -> Next 5 upcoming events for dashboard widget
router.get("/upcoming", async (req, res) => {
  try {
    const role = req.user?.role || "student";
    const { departmentId, semester, referenceDate, limit = 5 } = req.query;

    const allEvents = await getAcademicCalendarEvents({
      departmentId,
      semester,
      role,
      referenceDate,
    });

    // Filter upcoming (TODAY, TOMORROW, UPCOMING)
    const upcoming = allEvents
      .filter((ev) => ev.relative_state !== "PAST" && ev.status === "PUBLISHED")
      .slice(0, Number(limit));

    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch upcoming events." });
  }
});

// GET /api/academic-calendar/:id -> Get single event details with history
router.get("/:id", async (req, res) => {
  try {
    const event = await getAcademicCalendarEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Calendar event not found." });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic-calendar -> HOD / Admin create event
router.post("/", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal" && userRole !== "examdept") {
      return res.status(403).json({ error: "Unauthorized. Only HOD/Admin can create calendar events." });
    }

    const newEvent = await createAcademicCalendarEvent({
      ...req.body,
      created_by: req.user.id,
    });

    await logAuditEvent({
      userId: req.user.id,
      userRole,
      action: "ACADEMIC_CALENDAR_EVENT_CREATED",
      entityType: "academic_calendar_events",
      entityId: newEvent.id,
      newValue: newEvent.title,
    });

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create academic event." });
  }
});

// PUT /api/academic-calendar/:id -> Update event details / dates
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal" && userRole !== "examdept") {
      return res.status(403).json({ error: "Unauthorized. Only HOD/Admin can modify calendar events." });
    }

    const updated = await updateAcademicCalendarEvent(req.params.id, req.body, {
      userId: req.user.id,
      userRole,
    });

    await logAuditEvent({
      userId: req.user.id,
      userRole,
      action: "ACADEMIC_CALENDAR_EVENT_UPDATED",
      entityType: "academic_calendar_events",
      entityId: updated.id,
      newValue: updated.title,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update academic event." });
  }
});

// POST /api/academic-calendar/:id/publish -> Publish draft event
router.post("/:id/publish", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal" && userRole !== "examdept") {
      return res.status(403).json({ error: "Unauthorized. Only HOD can publish events." });
    }

    const published = await publishAcademicCalendarEvent(req.params.id, {
      userId: req.user.id,
      userRole,
    });

    await logAuditEvent({
      userId: req.user.id,
      userRole,
      action: "ACADEMIC_CALENDAR_EVENT_PUBLISHED",
      entityType: "academic_calendar_events",
      entityId: published.id,
      newValue: published.title,
    });

    res.json(published);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to publish event." });
  }
});

// POST /api/academic-calendar/:id/cancel -> Cancel event
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal" && userRole !== "examdept") {
      return res.status(403).json({ error: "Unauthorized to cancel event." });
    }

    const { reason } = req.body;
    const cancelled = await cancelAcademicCalendarEvent(req.params.id, reason, {
      userId: req.user.id,
      userRole,
    });

    await logAuditEvent({
      userId: req.user.id,
      userRole,
      action: "ACADEMIC_CALENDAR_EVENT_CANCELLED",
      entityType: "academic_calendar_events",
      entityId: cancelled.id,
      newValue: reason || "Cancelled",
    });

    res.json(cancelled);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to cancel event." });
  }
});

// POST /api/academic-calendar/:id/duplicate -> Duplicate event
router.post("/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal") {
      return res.status(403).json({ error: "Unauthorized to duplicate event." });
    }

    const duplicated = await duplicateAcademicCalendarEvent(req.params.id, {
      userId: req.user.id,
      userRole,
    });

    res.status(201).json(duplicated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to duplicate event." });
  }
});

// DELETE /api/academic-calendar/:id -> Delete event
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal") {
      return res.status(403).json({ error: "Unauthorized to delete calendar event." });
    }

    await deleteAcademicCalendarEvent(req.params.id);

    await logAuditEvent({
      userId: req.user.id,
      userRole,
      action: "ACADEMIC_CALENDAR_EVENT_DELETED",
      entityType: "academic_calendar_events",
      entityId: req.params.id,
    });

    res.json({ success: true, message: "Calendar event deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic-calendar/import -> Import document/JSON preview rows
router.post("/import", requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role || "hod";
    if (userRole !== "hod" && userRole !== "principal") {
      return res.status(403).json({ error: "Unauthorized to import calendar events." });
    }

    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "No events provided for import." });
    }

    const imported = await importAcademicCalendarEvents(events, {
      userId: req.user.id,
      userRole,
    });

    res.status(201).json({ success: true, count: imported.length, data: imported });
  } catch (err) {
    res.status(400).json({ error: err.message || "Import failed." });
  }
});

// GET /api/academic-calendar/export -> Export calendar as JSON
router.get("/export", async (req, res) => {
  try {
    const events = await getAcademicCalendarEvents({ role: "hod" });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="DSATM_MCA_Academic_Calendar.json"');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
