const express = require("express");
const { requireAuth } = require("../middleware/auth.js");
const {
  getDepartmentFacultyList,
  createClub,
  updateClub,
  deleteClub,
  getClubs,
  getClubById,
  joinClub,
  leaveClub,
  getClubMembers,
  createActivity,
  updateActivity,
  publishActivity,
  cancelActivity,
  getActivities,
  getActivityById,
  registerForActivity,
  cancelRegistration,
  getActivityRegistrations,
  markActivityParticipation,
  getActivityParticipation,
  recordActivityResults,
  getActivityResults,
  generateActivityCertificates,
  getHodClubAnalytics,
  getPrincipalClubAnalytics,
  getStudentClubProfile,
} = require("../services/clubService.js");

const router = express.Router();

router.use(requireAuth);

// 1. Faculty Lookup for HOD's Department
router.get("/department-faculty", async (req, res) => {
  try {
    const deptId = req.query.departmentId || req.user.department_id;
    const facultyList = await getDepartmentFacultyList(deptId);
    res.json(facultyList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Clubs Management Endpoints
router.get("/", async (req, res) => {
  try {
    const clubs = await getClubs(req.query, req.user);
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only HODs can create department clubs." });
    }
    const newClub = await createClub(req.body, req.user);
    res.status(201).json(newClub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const club = await getClubById(req.params.id, req.user.role === "student" ? req.user.id : null);
    if (!club) return res.status(404).json({ error: "Club not found." });
    res.json(club);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to update club." });
    }
    const updated = await updateClub(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to delete club." });
    }
    const result = await deleteClub(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ error: "Unauthorized." });
    }
    const updated = await updateClub(req.params.id, { status: req.body.status }, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/coordinator", async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ error: "Only HOD can assign club coordinators." });
    }
    const updated = await updateClub(req.params.id, { facultyCoordinatorId: req.body.facultyCoordinatorId }, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Student Membership Endpoints
router.post("/:id/join", async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can join clubs." });
    }
    const membership = await joinClub(req.user.id, req.params.id, req.user);
    res.status(201).json(membership);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/leave", async (req, res) => {
  try {
    const result = await leaveClub(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/members", async (req, res) => {
  try {
    const club = await getClubById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found." });
    const members = await getClubMembers(req.params.id);
    res.json(members || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Activities Endpoints
router.get("/activities/list", async (req, res) => {
  try {
    const activities = await getActivities(
      {
        clubId: req.query.clubId,
        departmentId: req.query.departmentId,
        facultyId: req.query.facultyId,
        studentId: req.user.role === "student" ? req.user.id : null,
        role: req.user.role,
        status: req.query.status,
      },
      req.user
    );
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/activities", async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ error: "Only faculty coordinators or HODs can create activities." });
    }
    const newActivity = await createActivity(req.body, req.user);
    res.status(201).json(newActivity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/activities/:id", async (req, res) => {
  try {
    const activity = await getActivityById(req.params.id, req.user.role === "student" ? req.user.id : null);
    if (!activity) return res.status(404).json({ error: "Activity not found." });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/activities/:id", async (req, res) => {
  try {
    const updated = await updateActivity(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/activities/:id/publish", async (req, res) => {
  try {
    const published = await publishActivity(req.params.id, req.user);
    res.json(published);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/activities/:id/cancel", async (req, res) => {
  try {
    const cancelled = await cancelActivity(req.params.id, req.body.reason, req.user);
    res.json(cancelled);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Registration Endpoints
router.post("/activities/:id/register", async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can register for technical activities." });
    }
    const reg = await registerForActivity(req.params.id, req.user, req.body);
    res.status(201).json(reg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/activities/:id/register", async (req, res) => {
  try {
    const result = await cancelRegistration(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/activities/:id/registrations", async (req, res) => {
  try {
    const list = await getActivityRegistrations(req.params.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Participation & Attendance
router.post("/activities/:id/participation", async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({ error: "Unauthorized to mark participation." });
    }
    const records = await markActivityParticipation(req.params.id, req.body.participation || [], req.user);
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/activities/:id/participation", async (req, res) => {
  try {
    const list = await getActivityParticipation(req.params.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Results & Winners
router.post("/activities/:id/results", async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({ error: "Unauthorized to enter results." });
    }
    const results = await recordActivityResults(req.params.id, req.body.results || [], req.user);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/activities/:id/results", async (req, res) => {
  try {
    const results = await getActivityResults(req.params.id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/activities/:id/certificates", async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({ error: "Unauthorized to generate certificates." });
    }
    const certs = await generateActivityCertificates(
      req.params.id,
      req.body.certificateType,
      req.body.recipientStudentIds,
      req.user
    );
    res.json(certs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Analytics & Profiles
router.get("/analytics/hod", async (req, res) => {
  try {
    const deptId = req.query.departmentId || req.user.department_id || "MCA";
    const stats = await getHodClubAnalytics(deptId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics/principal", async (req, res) => {
  try {
    const stats = await getPrincipalClubAnalytics();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/student/profile", async (req, res) => {
  try {
    const data = await getStudentClubProfile(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
