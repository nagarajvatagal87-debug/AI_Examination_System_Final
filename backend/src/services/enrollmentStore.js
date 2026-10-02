const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const ENROLLMENT_FILE = path.join(DATA_DIR, "persistent_enrollments.json");

// Map: subjectId -> Set<studentId>
const enrollmentStore = new Map();

function initEnrollments() {
  try {
    if (fs.existsSync(ENROLLMENT_FILE)) {
      const raw = fs.readFileSync(ENROLLMENT_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.entries(parsed).forEach(([subId, stdArray]) => {
          enrollmentStore.set(subId, new Set(Array.isArray(stdArray) ? stdArray : []));
        });
      }
      console.log(`Loaded enrollments for ${enrollmentStore.size} subjects from persistent disk storage.`);
    }
  } catch (e) {
    console.warn("Failed to initialize enrollment store:", e.message);
  }
}

function saveEnrollmentsToDisk() {
  try {
    const obj = {};
    for (const [subId, setOfStds] of enrollmentStore.entries()) {
      obj[subId] = Array.from(setOfStds);
    }
    fs.writeFileSync(ENROLLMENT_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save enrollments to disk:", e.message);
  }
}

initEnrollments();

function getEnrolledStudentIds(subjectId) {
  const setOfStds = enrollmentStore.get(subjectId);
  return setOfStds ? Array.from(setOfStds) : [];
}

function enrollStudent(subjectId, studentId) {
  if (!enrollmentStore.has(subjectId)) {
    enrollmentStore.set(subjectId, new Set());
  }
  enrollmentStore.get(subjectId).add(studentId);
  saveEnrollmentsToDisk();
}

function enrollMultipleStudents(subjectId, studentIds) {
  if (!enrollmentStore.has(subjectId)) {
    enrollmentStore.set(subjectId, new Set());
  }
  const set = enrollmentStore.get(subjectId);
  studentIds.forEach((id) => set.add(id));
  saveEnrollmentsToDisk();
}

function unenrollStudent(subjectId, studentId) {
  if (enrollmentStore.has(subjectId)) {
    enrollmentStore.get(subjectId).delete(studentId);
    saveEnrollmentsToDisk();
  }
}

module.exports = {
  getEnrolledStudentIds,
  enrollStudent,
  enrollMultipleStudents,
  unenrollStudent,
};
