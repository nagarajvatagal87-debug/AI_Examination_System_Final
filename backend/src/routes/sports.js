const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth.js");
const { supabaseAdmin } = require("../../config/Supabase");
const {
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
} = require("../services/sportsService.js");

const router = express.Router();

// Middleware: Authenticated requests
router.use(requireAuth);

// ---------------------------------------------------------------------------
// 1. DEPARTMENT FACULTY LOOKUP ENDPOINT
// ---------------------------------------------------------------------------
router.get("/department-faculty", async (req, res) => {
  try {
    const { departmentId } = req.query;
    const list = await getDepartmentFaculty(departmentId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. SPORTS MASTER DATA ENDPOINTS
// ---------------------------------------------------------------------------
router.get("/master", async (req, res) => {
  try {
    const list = await getSportsMaster();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/master", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to modify Sports Master Data." });
    }

    const created = await createSportsMaster(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/master/:id", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const updated = await updateSportsMaster(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. VENUE CONFLICT CHECKER ENDPOINT
// ---------------------------------------------------------------------------
router.get("/conflict-check", async (req, res) => {
  try {
    const { venue, eventDate, startTime, endTime, excludeEventId } = req.query;
    const conflict = checkVenueConflict(venue, eventDate, startTime, endTime, excludeEventId);
    res.json({
      hasConflict: Boolean(conflict),
      conflictingEvent: conflict,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. SPORTS EVENTS LIST & GET BY ID
// ---------------------------------------------------------------------------
router.get("/events", async (req, res) => {
  try {
    const role = req.user?.role || "student";
    const userId = req.user?.id || null;
    const { eventLevel, departmentId, sportId, status, search, assignedFacultyId } = req.query;

    let userDept = departmentId;
    if (!userDept && role === "student") {
      const { data: prof } = await supabaseAdmin.from("profiles").select("department_id").eq("id", userId).maybeSingle();
      if (prof?.department_id) userDept = prof.department_id;
    }

    const events = await getSportsEvents({
      eventLevel,
      departmentId: userDept,
      sportId,
      status,
      studentId: userId,
      search,
      role,
      assignedFacultyId,
      userId,
    });

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const event = await getSportsEventById(req.params.id, req.user?.id);
    if (!event) return res.status(404).json({ error: "Sports event not found." });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. CREATE / UPDATE / PUBLISH / CANCEL / DELETE SPORTS EVENTS
// ---------------------------------------------------------------------------
router.post("/events", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal" && role !== "faculty") {
      return res.status(403).json({ error: "Unauthorized. Only HOD, Sports Coordinator, or Authorized Faculty can create events." });
    }

    const created = await createSportsEvent(req.body, {
      userId: req.user.id,
      userRole: role,
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/events/:id", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal" && role !== "faculty") {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const updated = await updateSportsEvent(req.params.id, req.body, {
      userId: req.user.id,
      userRole: role,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/events/:id/publish", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal" && role !== "faculty") {
      return res.status(403).json({ error: "Unauthorized to publish sports event." });
    }

    const published = await publishSportsEvent(req.params.id, {
      userId: req.user.id,
      userRole: role,
    });

    res.json(published);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/events/:id/cancel", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal") {
      return res.status(403).json({ error: "Unauthorized to cancel sports event." });
    }

    const cancelled = await cancelSportsEvent(req.params.id, req.body.reason, {
      userId: req.user.id,
      userRole: role,
    });

    res.json(cancelled);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal") {
      return res.status(403).json({ error: "Unauthorized to delete sports event." });
    }

    await deleteSportsEvent(req.params.id);
    res.json({ success: true, message: "Sports event deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. STUDENT REGISTRATION ENDPOINTS
// ---------------------------------------------------------------------------
router.post("/events/:id/register", async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch full profile info for registration
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, section, department_id, departments(name)")
      .eq("id", studentId)
      .maybeSingle();

    const studentInfo = {
      full_name: prof?.full_name || req.user.full_name || "Student Participant",
      usn: prof?.registration_no || "1DT22MC000",
      department_id: prof?.department_id || "MCA",
      program: prof?.department_id || "MCA",
      semester: prof?.semester || "III",
      section: prof?.section || "A",
    };

    const registration = await registerStudentForSports(req.params.id, studentId, studentInfo);
    res.status(201).json({
      success: true,
      message: "Successfully registered for sports event!",
      registration,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/events/:id/unregister", async (req, res) => {
  try {
    await cancelStudentRegistration(req.params.id, req.user.id);
    res.json({ success: true, message: "Registration cancelled." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. TEAM MANAGEMENT & ROSTERS
// ---------------------------------------------------------------------------
router.get("/events/:id/teams", async (req, res) => {
  try {
    const teams = await getSportsTeams(req.params.id);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/events/:id/teams", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "faculty") {
      return res.status(403).json({ error: "Unauthorized to manage teams." });
    }

    const team = await createSportsTeam(req.params.id, req.body);
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. SPORTS RESULTS & ACHIEVEMENTS
// ---------------------------------------------------------------------------
router.post("/events/:id/result", async (req, res) => {
  try {
    const role = req.user?.role || "sports_coordinator";
    if (role !== "sports_coordinator" && role !== "hod" && role !== "principal") {
      return res.status(403).json({ error: "Unauthorized to publish results." });
    }

    const result = await publishSportsResult(req.params.id, req.body, {
      userId: req.user.id,
      userRole: role,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/achievements", async (req, res) => {
  try {
    const { studentId, departmentId } = req.query;
    const achievements = await getSportsAchievements({ studentId, departmentId });
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. REAL DASHBOARD STATS
// ---------------------------------------------------------------------------
router.get("/stats", async (req, res) => {
  try {
    const { departmentId } = req.query;
    const stats = await getSportsOverviewStats({ departmentId });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
