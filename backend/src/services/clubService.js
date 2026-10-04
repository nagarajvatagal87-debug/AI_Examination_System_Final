const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");
const { notify, sendEmail } = require("./notification.service");
const calendarService = require("./calendarService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const CLUBS_FILE = path.join(DATA_DIR, "persistent_clubs.json");
const MEMBERSHIPS_FILE = path.join(DATA_DIR, "persistent_club_memberships.json");
const ACTIVITIES_FILE = path.join(DATA_DIR, "persistent_activities.json");
const REGISTRATIONS_FILE = path.join(DATA_DIR, "persistent_activity_registrations.json");
const PARTICIPATION_FILE = path.join(DATA_DIR, "persistent_activity_participation.json");
const RESULTS_FILE = path.join(DATA_DIR, "persistent_activity_results.json");
const CERTIFICATES_FILE = path.join(DATA_DIR, "persistent_activity_certificates.json");
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, "persistent_activity_achievements.json");

let memoryClubs = [];
let memoryMemberships = [];
let memoryActivities = [];
let memoryRegistrations = [];
let memoryParticipation = [];
let memoryResults = [];
let memoryCertificates = [];
let memoryAchievements = [];

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

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn(`Failed to save ${filePath}:`, e.message);
  }
}

memoryClubs = loadJsonFile(CLUBS_FILE, []);
memoryMemberships = loadJsonFile(MEMBERSHIPS_FILE, []);
memoryActivities = loadJsonFile(ACTIVITIES_FILE, []);
memoryRegistrations = loadJsonFile(REGISTRATIONS_FILE, []);
memoryParticipation = loadJsonFile(PARTICIPATION_FILE, []);
memoryResults = loadJsonFile(RESULTS_FILE, []);
memoryCertificates = loadJsonFile(CERTIFICATES_FILE, []);
memoryAchievements = loadJsonFile(ACHIEVEMENTS_FILE, []);

// Sync Supabase tables on startup if available
async function syncDatabaseTables() {
  try {
    const { data: c } = await supabaseAdmin.from("clubs").select("*");
    if (c && c.length > 0) {
      memoryClubs = c;
      saveJsonFile(CLUBS_FILE, memoryClubs);
    }
  } catch (e) {}

  try {
    const { data: a } = await supabaseAdmin.from("activities").select("*");
    if (a && a.length > 0) {
      memoryActivities = a;
      saveJsonFile(ACTIVITIES_FILE, memoryActivities);
    }
  } catch (e) {}
}
syncDatabaseTables().catch(() => {});

/**
 * 1. FACULTY LOOKUP FOR HOD'S DEPARTMENT
 */
async function getDepartmentFacultyList(departmentId) {
  let facultyList = [];
  try {
    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, department_id, departments(name)")
      .eq("role", "faculty");

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;
    if (!error && data) {
      facultyList = data.map((f) => ({
        id: f.id,
        full_name: f.full_name || f.email || "Faculty Member",
        email: f.email,
        department_id: f.department_id,
        department_name: f.departments?.name || "Department",
      }));
    }
  } catch (e) {}

  if (facultyList.length === 0) {
    try {
      const { data: allFac } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, department_id")
        .eq("role", "faculty");

      if (allFac) {
        facultyList = allFac.map((f) => ({
          id: f.id,
          full_name: f.full_name || f.email,
          email: f.email,
          department_id: f.department_id,
          department_name: "Faculty Member",
        }));
      }
    } catch (e) {}
  }

  return facultyList;
}

/**
 * 2. CLUB MANAGEMENT (HOD)
 */
async function createClub(clubData, userPayload) {
  const { name, code, description, type, academicYear, facultyCoordinatorId, status } = clubData;

  if (!name || !name.trim()) {
    throw new Error("Club name is required.");
  }

  const deptId = userPayload.department_id || clubData.departmentId || "MCA";

  let facultyName = null;
  let facultyEmail = null;
  if (facultyCoordinatorId) {
    try {
      const { data: fac } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", facultyCoordinatorId)
        .maybeSingle();

      if (fac) {
        facultyName = fac.full_name;
        facultyEmail = fac.email;
      }
    } catch (e) {}
  }

  const newClub = {
    id: `club-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    code: (code || name.substring(0, 3).toUpperCase() + "-" + deptId).trim(),
    description: (description || "").trim(),
    type: type || "Technical",
    department_id: deptId,
    academic_year: academicYear || "2026-2027",
    faculty_coordinator_id: facultyCoordinatorId || null,
    faculty_name: facultyName,
    faculty_email: facultyEmail,
    status: status || "ACTIVE",
    created_by: userPayload.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryClubs.unshift(newClub);
  saveJsonFile(CLUBS_FILE, memoryClubs);

  try {
    await supabaseAdmin.from("clubs").insert(newClub);
  } catch (e) {}

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role || "hod",
    action: "CLUB_CREATED",
    entityType: "CLUB",
    entityId: newClub.id,
    newValue: newClub.name,
    departmentId: deptId,
  });

  if (facultyCoordinatorId && facultyEmail) {
    const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    const notifTitle = "🎓 Assigned as Club Coordinator";
    const notifBody = `You have been assigned as the Faculty Coordinator for "${newClub.name}" (${newClub.academic_year}) by HOD.\n\nResponsibility: Create and manage technical activities, workshops, competitions, and student participation for this club.`;

    await notify(facultyCoordinatorId, "club_assignment", notifTitle, notifBody);
    await sendEmail(
      facultyEmail,
      `You have been assigned as Club Coordinator – ${newClub.name}`,
      `Dear ${facultyName || "Faculty Member"},\n\nYou have been assigned as the Faculty Coordinator for "${newClub.name}" (${deptId} Department) for Academic Year ${newClub.academic_year} by your HOD.\n\nPlease log in to your Faculty Dashboard to manage club activities.\n\nDashboard: ${portalUrl}`
    );
  }

  return newClub;
}

async function updateClub(clubId, updateData, userPayload) {
  const index = memoryClubs.findIndex((c) => c.id === clubId);
  if (index === -1) {
    throw new Error("Club not found.");
  }

  const existing = memoryClubs[index];
  if (userPayload.role === "hod" && existing.department_id !== userPayload.department_id) {
    throw new Error("Unauthorized: Cannot modify a club outside your department.");
  }

  let facultyName = existing.faculty_name;
  let facultyEmail = existing.faculty_email;
  const oldCoordinatorId = existing.faculty_coordinator_id;
  const newCoordinatorId = updateData.facultyCoordinatorId !== undefined ? updateData.facultyCoordinatorId : existing.faculty_coordinator_id;

  if (newCoordinatorId && newCoordinatorId !== oldCoordinatorId) {
    try {
      const { data: fac } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", newCoordinatorId)
        .maybeSingle();

      if (fac) {
        facultyName = fac.full_name;
        facultyEmail = fac.email;
      }
    } catch (e) {}
  }

  const updatedClub = {
    ...existing,
    name: updateData.name !== undefined ? updateData.name.trim() : existing.name,
    code: updateData.code !== undefined ? updateData.code.trim() : existing.code,
    description: updateData.description !== undefined ? updateData.description.trim() : existing.description,
    type: updateData.type !== undefined ? updateData.type : existing.type,
    academic_year: updateData.academicYear !== undefined ? updateData.academicYear : existing.academic_year,
    faculty_coordinator_id: newCoordinatorId,
    faculty_name: facultyName,
    faculty_email: facultyEmail,
    status: updateData.status !== undefined ? updateData.status : existing.status,
    updated_at: new Date().toISOString(),
  };

  memoryClubs[index] = updatedClub;
  saveJsonFile(CLUBS_FILE, memoryClubs);

  try {
    await supabaseAdmin.from("clubs").update(updatedClub).eq("id", clubId);
  } catch (e) {}

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "CLUB_UPDATED",
    entityType: "CLUB",
    entityId: clubId,
    newValue: updatedClub.name,
    departmentId: updatedClub.department_id,
  });

  if (newCoordinatorId && newCoordinatorId !== oldCoordinatorId && facultyEmail) {
    const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    await notify(newCoordinatorId, "club_assignment", "🎓 Assigned as Club Coordinator", `You have been assigned as the Faculty Coordinator for "${updatedClub.name}" by HOD.`);
    await sendEmail(
      facultyEmail,
      `You have been assigned as Club Coordinator – ${updatedClub.name}`,
      `Dear ${facultyName || "Faculty Member"},\n\nYou have been assigned as the Faculty Coordinator for "${updatedClub.name}" for Academic Year ${updatedClub.academic_year}.\n\nDashboard: ${portalUrl}`
    );
  }

  return updatedClub;
}

async function deleteClub(clubId, userPayload) {
  const index = memoryClubs.findIndex((c) => c.id === clubId);
  if (index === -1) {
    throw new Error("Club not found.");
  }

  const existing = memoryClubs[index];
  if (userPayload.role === "hod" && existing.department_id !== userPayload.department_id) {
    throw new Error("Unauthorized: Cannot delete a club outside your department.");
  }

  memoryClubs.splice(index, 1);
  saveJsonFile(CLUBS_FILE, memoryClubs);

  try {
    await supabaseAdmin.from("clubs").delete().eq("id", clubId);
  } catch (e) {}

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "CLUB_DELETED",
    entityType: "CLUB",
    entityId: clubId,
    newValue: existing.name,
    departmentId: existing.department_id,
  });

  return { success: true, deletedId: clubId };
}


async function getClubs({ departmentId, facultyId, studentId, role, status } = {}, userPayload = {}) {
  let list = [...memoryClubs];
  const effectiveRole = userPayload.role || role;

  if (effectiveRole === "hod") {
    const effectiveDept = userPayload.department_id || departmentId;
    if (effectiveDept) {
      list = list.filter((c) => c.department_id === effectiveDept);
    }
  } else if (effectiveRole === "faculty") {
    const effectiveFacId = userPayload.id || facultyId;
    list = list.filter((c) => c.faculty_coordinator_id === effectiveFacId);
  } else if (effectiveRole === "student") {
    list = list.filter((c) => c.status === "ACTIVE");
  } else if (status) {
    list = list.filter((c) => c.status === status);
  }

  const enriched = list.map((club) => {
    const members = memoryMemberships.filter((m) => m.club_id === club.id && m.status === "ACTIVE");
    const activities = memoryActivities.filter((a) => a.club_id === club.id);
    const isMember = studentId ? members.some((m) => m.student_id === studentId) : false;

    return {
      ...club,
      memberCount: members.length,
      activityCount: activities.length,
      isMember,
    };
  });

  return enriched;
}

async function getClubById(clubId, studentId = null) {
  const club = memoryClubs.find((c) => c.id === clubId);
  if (!club) return null;

  const members = memoryMemberships.filter((m) => m.club_id === clubId && m.status === "ACTIVE");
  const activities = memoryActivities.filter((a) => a.club_id === clubId);
  const isMember = studentId ? members.some((m) => m.student_id === studentId) : false;

  return {
    ...club,
    memberCount: members.length,
    activityCount: activities.length,
    isMember,
    members,
    activities,
  };
}

/**
 * 3. CLUB MEMBERSHIP (STUDENT)
 */
async function joinClub(studentId, clubId, userPayload) {
  const club = memoryClubs.find((c) => c.id === clubId);
  if (!club || club.status !== "ACTIVE") {
    throw new Error("Club is not active or available.");
  }

  const acadYear = club.academic_year || "2026-2027";
  const existing = memoryMemberships.find(
    (m) => m.club_id === clubId && m.student_id === studentId && m.academic_year === acadYear && m.status === "ACTIVE"
  );

  if (existing) {
    return existing;
  }

  const newMembership = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    club_id: clubId,
    student_id: studentId,
    student_name: userPayload.full_name || userPayload.email || "Student",
    student_usn: userPayload.registration_no || userPayload.registrationNo || "USN Pending",
    academic_year: acadYear,
    status: "ACTIVE",
    joined_at: new Date().toISOString(),
  };

  memoryMemberships.unshift(newMembership);
  saveJsonFile(MEMBERSHIPS_FILE, memoryMemberships);

  try {
    await supabaseAdmin.from("club_memberships").insert(newMembership);
  } catch (e) {}

  await logAuditEvent({
    userId: studentId,
    userRole: "student",
    action: "JOINED_CLUB",
    entityType: "CLUB_MEMBERSHIP",
    entityId: newMembership.id,
    newValue: club.name,
    departmentId: club.department_id,
  });

  return newMembership;
}

async function leaveClub(studentId, clubId) {
  const index = memoryMemberships.findIndex((m) => m.club_id === clubId && m.student_id === studentId && m.status === "ACTIVE");
  if (index !== -1) {
    memoryMemberships[index].status = "LEFT";
    saveJsonFile(MEMBERSHIPS_FILE, memoryMemberships);
  }
  return { status: "left", clubId };
}

async function getClubMembers(clubId) {
  return memoryMemberships.filter((m) => m.club_id === clubId && m.status === "ACTIVE");
}


/**
 * 4. ACTIVITIES MANAGEMENT (FACULTY COORDINATOR)
 */
async function createActivity(activityData, userPayload) {
  const {
    clubId, activityName, activityType, description, additionalInfo,
    startDate, endDate, startTime, endTime, venue,
    registrationStart, registrationEnd, maxParticipants, participationType, teamSize,
    eligibilityDepartment, eligibilityProgram, eligibilitySemester, eligibilitySection, eligibilityAcademicYear,
    instructions, requiredMaterials, evaluationCriteria, status
  } = activityData;

  if (!activityName || !activityName.trim()) {
    throw new Error("Activity name is required.");
  }
  if (!clubId) {
    throw new Error("Club ID is required.");
  }

  const club = memoryClubs.find((c) => c.id === clubId);
  if (!club) {
    throw new Error("Target club does not exist.");
  }

  if (userPayload.role === "faculty" && club.faculty_coordinator_id !== userPayload.id) {
    throw new Error("Unauthorized: You are not the assigned coordinator for this club.");
  }

  const newActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    club_id: clubId,
    club_name: club.name,
    department_id: club.department_id,
    activity_name: activityName.trim(),
    activity_type: activityType || "Workshop",
    description: (description || "").trim(),
    additional_info: (additionalInfo || "").trim(),
    schedule: {
      start_date: startDate || new Date().toISOString().split("T")[0],
      end_date: endDate || startDate || new Date().toISOString().split("T")[0],
      start_time: startTime || "10:00 AM",
      end_time: endTime || "04:00 PM",
      venue: venue || "DSATM Seminar Hall",
    },
    registration: {
      registration_start: registrationStart || new Date().toISOString().split("T")[0],
      registration_end: registrationEnd || startDate || new Date().toISOString().split("T")[0],
      max_participants: Number(maxParticipants) || 50,
      participation_type: participationType || "INDIVIDUAL",
      team_size: Number(teamSize) || 1,
    },
    eligibility: {
      department_id: eligibilityDepartment || club.department_id,
      program: eligibilityProgram || "ALL",
      semester: eligibilitySemester || "ALL",
      section: eligibilitySection || "ALL",
      academic_year: eligibilityAcademicYear || club.academic_year || "2026-2027",
    },
    rules: {
      instructions: instructions || "Follow standard code of conduct.",
      required_materials: requiredMaterials || "Laptop and student ID.",
      evaluation_criteria: evaluationCriteria || "Participation & Technical merit.",
    },
    status: status || "DRAFT",
    created_by: userPayload.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryActivities.unshift(newActivity);
  saveJsonFile(ACTIVITIES_FILE, memoryActivities);

  try {
    await supabaseAdmin.from("activities").insert(newActivity);
  } catch (e) {}

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "ACTIVITY_CREATED",
    entityType: "ACTIVITY",
    entityId: newActivity.id,
    newValue: newActivity.activity_name,
    departmentId: club.department_id,
  });

  return newActivity;
}

async function updateActivity(activityId, updateData, userPayload) {
  const index = memoryActivities.findIndex((a) => a.id === activityId);
  if (index === -1) {
    throw new Error("Activity not found.");
  }

  const existing = memoryActivities[index];
  const club = memoryClubs.find((c) => c.id === existing.club_id);

  if (userPayload.role === "faculty" && club?.faculty_coordinator_id !== userPayload.id) {
    throw new Error("Unauthorized: You are not assigned to this club.");
  }

  const updatedActivity = {
    ...existing,
    activity_name: updateData.activityName !== undefined ? updateData.activityName.trim() : existing.activity_name,
    activity_type: updateData.activityType !== undefined ? updateData.activityType : existing.activity_type,
    description: updateData.description !== undefined ? updateData.description.trim() : existing.description,
    additional_info: updateData.additionalInfo !== undefined ? updateData.additionalInfo.trim() : existing.additional_info,
    schedule: {
      ...existing.schedule,
      ...(updateData.schedule || {}),
      start_date: updateData.startDate || existing.schedule.start_date,
      end_date: updateData.endDate || existing.schedule.end_date,
      start_time: updateData.startTime || existing.schedule.start_time,
      end_time: updateData.endTime || existing.schedule.end_time,
      venue: updateData.venue || existing.schedule.venue,
    },
    registration: {
      ...existing.registration,
      ...(updateData.registration || {}),
      max_participants: updateData.maxParticipants ? Number(updateData.maxParticipants) : existing.registration.max_participants,
      participation_type: updateData.participationType || existing.registration.participation_type,
      team_size: updateData.teamSize ? Number(updateData.teamSize) : existing.registration.team_size,
    },
    status: updateData.status !== undefined ? updateData.status : existing.status,
    updated_at: new Date().toISOString(),
  };

  memoryActivities[index] = updatedActivity;
  saveJsonFile(ACTIVITIES_FILE, memoryActivities);

  try {
    await supabaseAdmin.from("activities").update(updatedActivity).eq("id", activityId);
  } catch (e) {}

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "ACTIVITY_UPDATED",
    entityType: "ACTIVITY",
    entityId: activityId,
    newValue: updatedActivity.activity_name,
    departmentId: existing.department_id,
  });

  return updatedActivity;
}

/**
 * 5. DRAFT -> PUBLISH WORKFLOW
 */
async function publishActivity(activityId, userPayload) {
  const index = memoryActivities.findIndex((a) => a.id === activityId);
  if (index === -1) {
    throw new Error("Activity not found.");
  }

  const activity = memoryActivities[index];
  const club = memoryClubs.find((c) => c.id === activity.club_id);

  if (userPayload.role === "faculty" && club?.faculty_coordinator_id !== userPayload.id) {
    throw new Error("Unauthorized: You are not assigned to this club.");
  }

  activity.status = "PUBLISHED";
  activity.published_by = userPayload.id;
  activity.published_at = new Date().toISOString();
  activity.updated_at = new Date().toISOString();

  memoryActivities[index] = activity;
  saveJsonFile(ACTIVITIES_FILE, memoryActivities);

  try {
    await supabaseAdmin.from("activities").update(activity).eq("id", activityId);
  } catch (e) {}

  // 1. Link to Academic Calendar
  try {
    await calendarService.createAcademicCalendarEvent({
      title: `[${club?.name || "Club"}] ${activity.activity_name}`,
      event_type: "STUDENT_ACTIVITY",
      department_id: activity.department_id,
      program: activity.eligibility?.program || "ALL",
      semester: activity.eligibility?.semester || "ALL",
      academic_year: activity.eligibility?.academic_year || "2026-2027",
      start_date: activity.schedule?.start_date,
      end_date: activity.schedule?.end_date,
      start_time: activity.schedule?.start_time,
      end_time: activity.schedule?.end_time,
      description: `${activity.description}\n\nVenue: ${activity.schedule?.venue}\nType: ${activity.activity_type}`,
      location: activity.schedule?.venue,
      audience: ["students", "faculty", "hod"],
      status: "PUBLISHED",
      activity_id: activity.id,
    }, { userId: userPayload.id, role: userPayload.role });
  } catch (e) {
    console.warn("Calendar integration note:", e.message);
  }

  // 2. Dispatch Notifications & Emails to Eligible Students
  try {
    let studentProfiles = [];
    const { data: stData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, department_id")
      .eq("role", "student");

    if (stData && stData.length > 0) {
      studentProfiles = stData;
    }

    const eligibleStudents = studentProfiles.filter((s) => {
      if (!activity.eligibility?.department_id || activity.eligibility.department_id === "ALL") return true;
      return s.department_id === activity.eligibility.department_id || s.department_id === club?.department_id;
    });

    const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    const notifTitle = `🚀 New Activity: ${activity.activity_name}`;
    const notifBody = `${club?.name} has published a new activity "${activity.activity_name}" (${activity.activity_type}). Date: ${activity.schedule?.start_date} at ${activity.schedule?.venue}.`;

    for (const st of eligibleStudents) {
      await notify(st.id, "activity_published", notifTitle, notifBody);
      if (st.email) {
        await sendEmail(
          st.email,
          `New Technical Activity Available – ${activity.activity_name}`,
          `Dear ${st.full_name || "Student"},\n\n"${club?.name}" has published a new technical activity "${activity.activity_name}".\n\nDate: ${activity.schedule?.start_date}\nTime: ${activity.schedule?.start_time}\nVenue: ${activity.schedule?.venue}\n\nPlease register via the Student Portal.\n\nPortal: ${portalUrl}`
        );
      }
    }
  } catch (e) {
    console.warn("Student notification dispatch note:", e.message);
  }

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "ACTIVITY_PUBLISHED",
    entityType: "ACTIVITY",
    entityId: activityId,
    newValue: activity.activity_name,
    departmentId: activity.department_id,
  });

  return activity;
}

async function cancelActivity(activityId, reason, userPayload) {
  const index = memoryActivities.findIndex((a) => a.id === activityId);
  if (index === -1) {
    throw new Error("Activity not found.");
  }

  const activity = memoryActivities[index];
  activity.status = "CANCELLED";
  activity.cancellation_reason = reason || "Cancelled by department";
  activity.updated_at = new Date().toISOString();

  memoryActivities[index] = activity;
  saveJsonFile(ACTIVITIES_FILE, memoryActivities);

  // Notify registered students
  const regs = memoryRegistrations.filter((r) => r.activity_id === activityId && r.registration_status === "REGISTERED");
  for (const r of regs) {
    r.registration_status = "CANCELLED";
    await notify(r.student_id, "activity_cancelled", `⚠️ Activity Cancelled: ${activity.activity_name}`, `The activity "${activity.activity_name}" has been cancelled. Reason: ${reason || "Administrative decision"}.`);
    if (r.student_email) {
      await sendEmail(r.student_email, `Activity Cancelled – ${activity.activity_name}`, `Dear ${r.student_name},\n\nPlease be informed that "${activity.activity_name}" scheduled for ${activity.schedule?.start_date} has been CANCELLED.\n\nReason: ${reason || "Administrative decision"}.`);
    }
  }
  saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "ACTIVITY_CANCELLED",
    entityType: "ACTIVITY",
    entityId: activityId,
    reason: reason,
    departmentId: activity.department_id,
  });

  return activity;
}

async function getActivities({ clubId, departmentId, facultyId, studentId, role, status } = {}, userPayload = {}) {
  let list = [...memoryActivities];

  if (clubId) {
    list = list.filter((a) => a.club_id === clubId);
  }

  const effectiveRole = userPayload.role || role;

  if (effectiveRole === "faculty") {
    const effectiveFacId = userPayload.id || facultyId;
    const assignedClubs = memoryClubs.filter((c) => c.faculty_coordinator_id === effectiveFacId).map((c) => c.id);
    list = list.filter((a) => assignedClubs.includes(a.club_id) || a.created_by === effectiveFacId);
  } else if (effectiveRole === "student") {
    list = list.filter((a) => a.status === "PUBLISHED" || a.status === "ONGOING" || a.status === "COMPLETED");
  } else if (effectiveRole === "hod") {
    const deptClubs = memoryClubs.filter((c) => c.department_id === (userPayload.department_id || departmentId)).map((c) => c.id);
    list = list.filter((a) => deptClubs.includes(a.club_id) || a.department_id === (userPayload.department_id || departmentId));
  }

  if (status) {
    list = list.filter((a) => a.status === status);
  }

  const enriched = list.map((act) => {
    const regs = memoryRegistrations.filter((r) => r.activity_id === act.id && r.registration_status === "REGISTERED");
    const myReg = studentId ? memoryRegistrations.find((r) => r.activity_id === act.id && r.student_id === studentId && r.registration_status === "REGISTERED") : null;
    const results = memoryResults.filter((res) => res.activity_id === act.id);

    return {
      ...act,
      registeredCount: regs.length,
      availableCapacity: Math.max(0, (act.registration?.max_participants || 50) - regs.length),
      isRegistered: Boolean(myReg),
      myRegistration: myReg || null,
      hasResults: results.length > 0,
    };
  });

  return enriched;
}

async function getActivityById(activityId, studentId = null) {
  const act = memoryActivities.find((a) => a.id === activityId);
  if (!act) return null;

  const regs = memoryRegistrations.filter((r) => r.activity_id === activityId && r.registration_status === "REGISTERED");
  const myReg = studentId ? memoryRegistrations.find((r) => r.activity_id === activityId && r.student_id === studentId && r.registration_status === "REGISTERED") : null;
  const participation = memoryParticipation.filter((p) => p.activity_id === activityId);
  const results = memoryResults.filter((res) => res.activity_id === activityId);

  return {
    ...act,
    registeredCount: regs.length,
    availableCapacity: Math.max(0, (act.registration?.max_participants || 50) - regs.length),
    isRegistered: Boolean(myReg),
    myRegistration: myReg || null,
    registrations: regs,
    participation,
    results,
  };
}

/**
 * 6. STUDENT REGISTRATION
 */
async function registerForActivity(activityId, studentUser, payload = {}) {
  const activity = memoryActivities.find((a) => a.id === activityId);
  if (!activity) {
    throw new Error("Activity not found.");
  }
  if (activity.status !== "PUBLISHED" && activity.status !== "ONGOING") {
    throw new Error("Activity registration is not open.");
  }

  const activeRegs = memoryRegistrations.filter((r) => r.activity_id === activityId && r.registration_status === "REGISTERED");
  if (activeRegs.length >= (activity.registration?.max_participants || 50)) {
    throw new Error("Activity registration capacity is full.");
  }

  const existing = memoryRegistrations.find(
    (r) => r.activity_id === activityId && r.student_id === studentUser.id && r.registration_status === "REGISTERED"
  );
  if (existing) {
    throw new Error("You are already registered for this activity.");
  }

  const isTeam = activity.registration?.participation_type === "TEAM";
  const newRegistration = {
    id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    activity_id: activityId,
    activity_name: activity.activity_name,
    club_id: activity.club_id,
    student_id: studentUser.id,
    student_name: studentUser.full_name || studentUser.email || "Student",
    student_usn: studentUser.registration_no || studentUser.registrationNo || "USN Pending",
    student_email: studentUser.email,
    department_id: studentUser.department_id || activity.department_id,
    participation_type: isTeam ? "TEAM" : "INDIVIDUAL",
    team_name: isTeam ? (payload.teamName || `${studentUser.full_name}'s Team`).trim() : null,
    team_members: isTeam ? (payload.teamMembers || []) : [],
    registration_status: "REGISTERED",
    registered_at: new Date().toISOString(),
  };

  memoryRegistrations.unshift(newRegistration);
  saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);

  try {
    await supabaseAdmin.from("activity_registrations").insert(newRegistration);
  } catch (e) {}

  await logAuditEvent({
    userId: studentUser.id,
    userRole: "student",
    action: "STUDENT_REGISTERED",
    entityType: "ACTIVITY_REGISTRATION",
    entityId: newRegistration.id,
    newValue: activity.activity_name,
    departmentId: activity.department_id,
  });

  await notify(
    studentUser.id,
    "registration_success",
    `✅ Registered for ${activity.activity_name}`,
    `Your registration for "${activity.activity_name}" (${activity.schedule?.start_date} at ${activity.schedule?.venue}) is confirmed.`
  );

  if (studentUser.email) {
    const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    await sendEmail(
      studentUser.email,
      `Registration Confirmed – ${activity.activity_name}`,
      `Dear ${newRegistration.student_name},\n\nYour registration for technical activity "${activity.activity_name}" is CONFIRMED!\n\nDate: ${activity.schedule?.start_date}\nTime: ${activity.schedule?.start_time}\nVenue: ${activity.schedule?.venue}\nType: ${newRegistration.participation_type}${isTeam ? " (Team: " + newRegistration.team_name + ")" : ""}\n\nPortal: ${portalUrl}`
    );
  }

  return newRegistration;
}

async function cancelRegistration(activityId, studentId) {
  const index = memoryRegistrations.findIndex(
    (r) => r.activity_id === activityId && r.student_id === studentId && r.registration_status === "REGISTERED"
  );
  if (index !== -1) {
    memoryRegistrations[index].registration_status = "CANCELLED";
    memoryRegistrations[index].cancelled_at = new Date().toISOString();
    saveJsonFile(REGISTRATIONS_FILE, memoryRegistrations);
  }
  return { status: "cancelled", activityId };
}

async function getActivityRegistrations(activityId) {
  return memoryRegistrations.filter((r) => r.activity_id === activityId);
}

/**
 * 7. PARTICIPATION & ATTENDANCE
 */
async function markActivityParticipation(activityId, participationList, userPayload) {
  const activity = memoryActivities.find((a) => a.id === activityId);
  if (!activity) {
    throw new Error("Activity not found.");
  }

  const updatedRecords = [];
  for (const item of participationList) {
    const existingIndex = memoryParticipation.findIndex(
      (p) => p.activity_id === activityId && p.student_id === item.studentId
    );

    const record = {
      id: existingIndex !== -1 ? memoryParticipation[existingIndex].id : `part-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activity_id: activityId,
      student_id: item.studentId,
      student_name: item.studentName || "Student",
      student_usn: item.studentUsn || "USN",
      participation_status: item.status || "PARTICIPATED", // PARTICIPATED, ABSENT, DISQUALIFIED
      marked_by: userPayload.id,
      marked_at: new Date().toISOString(),
      remarks: item.remarks || "",
    };

    if (existingIndex !== -1) {
      memoryParticipation[existingIndex] = record;
    } else {
      memoryParticipation.unshift(record);
    }
    updatedRecords.push(record);
  }

  saveJsonFile(PARTICIPATION_FILE, memoryParticipation);

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "PARTICIPATION_MARKED",
    entityType: "ACTIVITY_PARTICIPATION",
    entityId: activityId,
    newValue: `Marked ${updatedRecords.length} students`,
    departmentId: activity.department_id,
  });

  return updatedRecords;
}

async function getActivityParticipation(activityId) {
  return memoryParticipation.filter((p) => p.activity_id === activityId);
}

/**
 * 8. RESULTS, ACHIEVEMENTS & CERTIFICATES
 */
async function recordActivityResults(activityId, resultsData, userPayload) {
  const activity = memoryActivities.find((a) => a.id === activityId);
  if (!activity) {
    throw new Error("Activity not found.");
  }

  const newResults = [];
  for (const item of resultsData) {
    const resEntry = {
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activity_id: activityId,
      activity_name: activity.activity_name,
      club_id: activity.club_id,
      student_id: item.studentId,
      student_name: item.studentName || "Student",
      student_usn: item.studentUsn || "USN",
      team_name: item.teamName || null,
      rank: item.rank || "Participant", // 1st Place, 2nd Place, 3rd Place, Finalist, Special Mention
      score: item.score || "",
      remarks: item.remarks || "",
      published_at: new Date().toISOString(),
    };

    memoryResults.unshift(resEntry);
    newResults.push(resEntry);

    // Auto-create Student Achievement
    if (item.studentId && (item.rank?.includes("Place") || item.rank?.includes("Winner") || item.rank?.includes("1st") || item.rank?.includes("2nd") || item.rank?.includes("3rd"))) {
      const ach = {
        id: `ach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        student_id: item.studentId,
        title: `${item.rank} – ${activity.activity_name}`,
        category: "Technical Activity",
        activity_name: activity.activity_name,
        club_name: activity.club_name,
        department_id: activity.department_id,
        rank: item.rank,
        date: activity.schedule?.start_date || new Date().toISOString().split("T")[0],
        issuer: "DSATM Department Club",
        created_at: new Date().toISOString(),
      };
      memoryAchievements.unshift(ach);

      await notify(item.studentId, "achievement_created", `🏆 Achievement Recorded: ${item.rank}`, `Congratulations! Your achievement "${item.rank} in ${activity.activity_name}" has been recorded on your Official Student Academic Profile.`);
    }

    // Notify Student
    if (item.studentId) {
      await notify(item.studentId, "result_published", `📊 Competition Result: ${activity.activity_name}`, `The results for "${activity.activity_name}" have been published. Rank: ${item.rank}.`);
    }
  }

  saveJsonFile(RESULTS_FILE, memoryResults);
  saveJsonFile(ACHIEVEMENTS_FILE, memoryAchievements);

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "RESULTS_ENTERED",
    entityType: "ACTIVITY_RESULTS",
    entityId: activityId,
    newValue: `Published results for ${resultsData.length} entries`,
    departmentId: activity.department_id,
  });

  return newResults;
}

async function getActivityResults(activityId) {
  return memoryResults.filter((r) => r.activity_id === activityId);
}

async function generateActivityCertificates(activityId, certType, recipientStudentIds, userPayload) {
  const activity = memoryActivities.find((a) => a.id === activityId);
  if (!activity) {
    throw new Error("Activity not found.");
  }

  const generatedCerts = [];
  const targetIds = recipientStudentIds || memoryRegistrations.filter((r) => r.activity_id === activityId && r.registration_status === "REGISTERED").map((r) => r.student_id);

  for (const stId of targetIds) {
    const reg = memoryRegistrations.find((r) => r.activity_id === activityId && r.student_id === stId);
    const res = memoryResults.find((r) => r.activity_id === activityId && r.student_id === stId);

    const verificationToken = `CERT-DSATM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const cert = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      verification_token: verificationToken,
      activity_id: activityId,
      activity_name: activity.activity_name,
      club_name: activity.club_name,
      department_id: activity.department_id,
      student_id: stId,
      student_name: reg?.student_name || "Student",
      student_usn: reg?.student_usn || "USN",
      certificate_type: certType || (res ? `${res.rank} Certificate` : "Participation Certificate"),
      issue_date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      verification_url: `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/verify-certificate?token=${verificationToken}`,
      created_at: new Date().toISOString(),
    };

    memoryCertificates.unshift(cert);
    generatedCerts.push(cert);

    await notify(stId, "certificate_available", `📜 Certificate Issued: ${activity.activity_name}`, `Your official certificate for "${activity.activity_name}" is now available on your Student Profile! Verification Token: ${verificationToken}`);
  }

  saveJsonFile(CERTIFICATES_FILE, memoryCertificates);

  await logAuditEvent({
    userId: userPayload.id,
    userRole: userPayload.role,
    action: "CERTIFICATE_GENERATED",
    entityType: "ACTIVITY_CERTIFICATE",
    entityId: activityId,
    newValue: `Generated ${generatedCerts.length} certificates`,
    departmentId: activity.department_id,
  });

  return generatedCerts;
}

/**
 * 9. ANALYTICS & DASHBOARD METRICS
 */
async function getHodClubAnalytics(departmentId) {
  const deptClubs = memoryClubs.filter((c) => c.department_id === departmentId);
  const activeClubs = deptClubs.filter((c) => c.status === "ACTIVE");
  const deptClubIds = deptClubs.map((c) => c.id);

  const deptActivities = memoryActivities.filter((a) => deptClubIds.includes(a.club_id) || a.department_id === departmentId);
  const upcomingActivities = deptActivities.filter((a) => a.status === "PUBLISHED");
  const completedActivities = deptActivities.filter((a) => a.status === "COMPLETED");

  const deptActIds = deptActivities.map((a) => a.id);
  const registrations = memoryRegistrations.filter((r) => deptActIds.includes(r.activity_id) && r.registration_status === "REGISTERED");
  const participation = memoryParticipation.filter((p) => deptActIds.includes(p.activity_id) && p.participation_status === "PARTICIPATED");
  const winners = memoryResults.filter((res) => deptActIds.includes(res.activity_id));

  const facultyCoordinatorsCount = new Set(deptClubs.map((c) => c.faculty_coordinator_id).filter(Boolean)).size;

  return {
    totalClubs: deptClubs.length,
    activeClubsCount: activeClubs.length,
    facultyCoordinatorsCount,
    totalActivities: deptActivities.length,
    upcomingActivitiesCount: upcomingActivities.length,
    completedActivitiesCount: completedActivities.length,
    totalRegistrations: registrations.length,
    totalParticipants: participation.length,
    totalWinnersCount: winners.length,
  };
}

async function getPrincipalClubAnalytics() {
  const activeClubs = memoryClubs.filter((c) => c.status === "ACTIVE");
  const totalActivities = memoryActivities.length;
  const publishedActivities = memoryActivities.filter((a) => a.status === "PUBLISHED" || a.status === "COMPLETED");
  const totalRegistrations = memoryRegistrations.filter((r) => r.registration_status === "REGISTERED").length;
  const totalParticipants = memoryParticipation.filter((p) => p.participation_status === "PARTICIPATED").length;

  // Department breakdown
  const departmentStats = {};
  for (const club of memoryClubs) {
    const dept = club.department_id || "General";
    if (!departmentStats[dept]) {
      departmentStats[dept] = { department: dept, clubsCount: 0, activitiesCount: 0, participantsCount: 0, winnersCount: 0 };
    }
    departmentStats[dept].clubsCount += 1;
  }

  for (const act of memoryActivities) {
    const dept = act.department_id || "General";
    if (!departmentStats[dept]) {
      departmentStats[dept] = { department: dept, clubsCount: 0, activitiesCount: 0, participantsCount: 0, winnersCount: 0 };
    }
    departmentStats[dept].activitiesCount += 1;

    const parts = memoryParticipation.filter((p) => p.activity_id === act.id && p.participation_status === "PARTICIPATED").length;
    departmentStats[dept].participantsCount += parts;

    const wins = memoryResults.filter((r) => r.activity_id === act.id).length;
    departmentStats[dept].winnersCount += wins;
  }

  return {
    totalClubs: memoryClubs.length,
    activeClubsCount: activeClubs.length,
    totalActivities,
    publishedActivitiesCount: publishedActivities.length,
    totalRegistrations,
    totalParticipants,
    departmentBreakdown: Object.values(departmentStats),
  };
}

async function getStudentClubProfile(studentId) {
  const memberships = memoryMemberships.filter((m) => m.student_id === studentId && m.status === "ACTIVE");
  const clubIds = memberships.map((m) => m.club_id);
  const myClubs = memoryClubs.filter((c) => clubIds.includes(c.id));

  const regs = memoryRegistrations.filter((r) => r.student_id === studentId && r.registration_status === "REGISTERED");
  const actIds = regs.map((r) => r.activity_id);
  const registeredActivities = memoryActivities.filter((a) => actIds.includes(a.id));

  const participation = memoryParticipation.filter((p) => p.student_id === studentId);
  const achievements = memoryAchievements.filter((a) => a.student_id === studentId);
  const certificates = memoryCertificates.filter((c) => c.student_id === studentId);

  return {
    clubs: myClubs,
    registeredActivities,
    participation,
    achievements,
    certificates,
  };
}

module.exports = {
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
};
