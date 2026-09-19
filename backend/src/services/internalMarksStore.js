const { supabaseAdmin } = require("../../config/Supabase");

// In-memory fallback store when internal_marks table isn't present in database schema
const memoryStore = new Map();
// Key format: `${subjectId}:${studentId}` -> mark object

const subjectStatusMap = new Map();
// Key format: subjectId -> status ('draft', 'submitted_to_hod', 'approved_by_hod')

async function getSubjectInternalMarks(subjectId) {
  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from("internal_marks")
      .select("*, profiles!internal_marks_student_id_fkey(id, full_name, registration_no)")
      .eq("subject_id", subjectId);

    if (!error && dbRows) {
      return dbRows;
    }
  } catch (err) {
    // DB query failed or table missing, fallback to memory store
  }

  // Fallback to memory store or student profiles in dept
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("department_id")
    .eq("id", subjectId)
    .single();

  let students = [];
  if (subject?.department_id) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no")
      .eq("role", "student")
      .eq("department_id", subject.department_id);
    students = data || [];
  }

  const subjectStatus = subjectStatusMap.get(subjectId) || "draft";

  return students.map((s) => {
    const memKey = `${subjectId}:${s.id}`;
    const rec = memoryStore.get(memKey) || {};

    const i1 = Number(rec.internal1_marks ?? 0);
    const i2 = Number(rec.internal2_marks ?? 0);
    const ass = Number(rec.assignment_marks ?? 0);
    const proj = Number(rec.project_marks ?? 0);
    const tot = i1 + i2 + ass + proj;
    const isEligible = tot >= 25;

    return {
      id: rec.id || `im-${s.id}`,
      subject_id: subjectId,
      student_id: s.id,
      internal1_marks: i1,
      internal2_marks: i2,
      assignment_marks: ass,
      project_marks: proj,
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
    const ass = Number(m.assignment || m.assignment_marks || 0);
    const proj = Number(m.project || m.project_marks || 0);
    const tot = i1 + i2 + ass + proj;
    const isEligible = tot >= 25;

    return {
      subject_id: subjectId,
      student_id: m.studentId || m.student_id,
      internal1_marks: i1,
      internal2_marks: i2,
      assignment_marks: ass,
      project_marks: proj,
      total_internal_marks: tot,
      is_eligible: isEligible,
      status: "draft",
      updated_at: new Date().toISOString(),
    };
  });

  // Store in memory
  rows.forEach((r) => {
    const key = `${subjectId}:${r.student_id}`;
    memoryStore.set(key, r);
  });

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
  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from("internal_marks")
      .select("*, subjects(id, name, code)")
      .eq("student_id", studentId);

    if (!error && dbRows && dbRows.length > 0) {
      return dbRows;
    }
  } catch (err) {}

  // Fallback to memory store
  const results = [];
  for (const [key, val] of memoryStore.entries()) {
    if (key.endsWith(`:${studentId}`)) {
      results.push(val);
    }
  }
  return results;
}

module.exports = {
  getSubjectInternalMarks,
  saveInternalMarks,
  setSubjectStatus,
  getStudentInternalMarks,
};
