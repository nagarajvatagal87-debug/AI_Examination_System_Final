const fs = require("fs");
const path = require("path");

const MARKS_FILE = path.join(__dirname, "../../persistent_internal_marks.json");

// In-memory fallback store when internal_marks table isn't present in database schema
const memoryStore = new Map();
// Key format: `${subjectId}:${studentId}` -> mark object

const subjectStatusMap = new Map();
// Key format: subjectId -> status ('draft', 'submitted_to_hod', 'approved_by_hod')

// Load persisted internal marks from disk on startup
try {
  if (fs.existsSync(MARKS_FILE)) {
    const raw = fs.readFileSync(MARKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, val]) => {
      memoryStore.set(key, val);
    });
    console.log(`Loaded ${memoryStore.size} persistent internal marks records from disk.`);
  }
} catch (e) {
  console.warn("Failed to load persistent internal marks file:", e.message);
}

function saveMarksToDisk() {
  try {
    const obj = {};
    for (const [key, val] of memoryStore.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(MARKS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save internal marks to disk:", e.message);
  }
}

const { getEnrolledStudentIds } = require("./enrollmentStore");

async function getSubjectInternalMarks(subjectId) {
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

  const subjectStatus = subjectStatusMap.get(subjectId) || "draft";

  return students.map((s) => {
    const memKey = `${subjectId}:${s.id}`;
    const rec = memoryStore.get(memKey) || {};

    const i1 = Number(rec.internal1_marks ?? 0);
    const i2 = Number(rec.internal2_marks ?? 0);
    const i3 = Number(rec.internal3_marks ?? rec.project_marks ?? 0);
    const ass = Number(rec.assignment_marks ?? 0);
    const tot = i1 + i2 + i3 + ass;
    const isEligible = tot >= 25;

    return {
      id: rec.id || `im-${s.id}`,
      subject_id: subjectId,
      student_id: s.id,
      internal1_marks: i1,
      internal2_marks: i2,
      internal3_marks: i3,
      assignment_marks: ass,
      total_internal_marks: tot,
      is_eligible: isEligible,
      status: rec.status || subjectStatus,
      hod_approved: rec.status === "approved_by_hod" || subjectStatus === "approved_by_hod",
      profiles: s,
    };
  });
}

async function saveInternalMarks(subjectId, marksArray) {
  const rows = marksArray.map((m) => {
    const i1 = Number(m.internal1 || m.internal1_marks || 0);
    const i2 = Number(m.internal2 || m.internal2_marks || 0);
    const i3 = Number(m.internal3 || m.internal3_marks || m.project || m.project_marks || 0);
    const ass = Number(m.assignment || m.assignment_marks || 0);
    const tot = i1 + i2 + i3 + ass;
    const isEligible = tot >= 25;

    return {
      subject_id: subjectId,
      student_id: m.studentId || m.student_id,
      internal1_marks: i1,
      internal2_marks: i2,
      internal3_marks: i3,
      assignment_marks: ass,
      total_internal_marks: tot,
      is_eligible: isEligible,
      status: "draft",
      updated_at: new Date().toISOString(),
    };
  });

  // Store in memory & save to persistent disk storage
  rows.forEach((r) => {
    const key = `${subjectId}:${r.student_id}`;
    memoryStore.set(key, r);
  });
  saveMarksToDisk();

  // Try DB upsert
  try {
    await supabaseAdmin.from("internal_marks").upsert(rows, { onConflict: "subject_id,student_id" });
  } catch (e) {
    // DB table missing note
  }

  return rows;
}

async function setSubjectStatus(subjectId, status) {
  subjectStatusMap.set(subjectId, status);

  // Update memory records
  for (const [key, val] of memoryStore.entries()) {
    if (key.startsWith(`${subjectId}:`)) {
      val.status = status;
      if (status === "approved_by_hod") val.hod_approved = true;
      memoryStore.set(key, val);
    }
  }

  // Try DB update
  try {
    await supabaseAdmin
      .from("internal_marks")
      .update({ status, hod_approved: status === "approved_by_hod" })
      .eq("subject_id", subjectId);
  } catch (e) {}
}

async function getStudentInternalMarks(studentId) {
  let dbRows = [];
  try {
    const { data: dbData, error } = await supabaseAdmin
      .from("internal_marks")
      .select("*, subjects(id, name, code)")
      .eq("student_id", studentId);

    if (!error && dbData) {
      dbRows = dbData;
    }
  } catch (err) {}

  const memRows = [];
  for (const [key, val] of memoryStore.entries()) {
    if (key.endsWith(`:${studentId}`)) {
      memRows.push(val);
    }
  }

  // Fetch subject info for memory rows if missing
  let allSubjects = [];
  try {
    const { data } = await supabaseAdmin.from("subjects").select("id, name, code");
    allSubjects = data || [];
  } catch (e) {}
  const subjMap = new Map((allSubjects || []).map((s) => [s.id, s]));

  const map = new Map();
  dbRows.forEach((r) => {
    map.set(r.subject_id, {
      ...r,
      subjects: r.subjects || subjMap.get(r.subject_id) || { id: r.subject_id, name: "Subject", code: "SUB" },
    });
  });

  memRows.forEach((r) => {
    const existing = map.get(r.subject_id) || {};
    map.set(r.subject_id, {
      ...existing,
      ...r,
      subjects: r.subjects || existing.subjects || subjMap.get(r.subject_id) || { id: r.subject_id, name: "Subject", code: "SUB" },
    });
  });

  return Array.from(map.values());
}

module.exports = {
  getSubjectInternalMarks,
  saveInternalMarks,
  setSubjectStatus,
  getStudentInternalMarks,
};
