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

// Default seed mapping for existing Deep Learning subject so existing database data is preserved
const DEEP_LEARNING_ID = "050ba71c-1308-415a-bbd4-d294de0eefe3";
const DEFAULT_STUDENT_IDS = [
  "a2316ce0-20ba-4500-9e47-be467b8f8a67", // Aishwarya
  "5b768ee2-41cf-417a-922d-0a1229ee6cc9", // Akshta
  "47764147-519c-4cd5-98d2-5a34a56f5d6d", // DIvya
  "1e7d1628-44a5-4479-877b-5491cca1c32d", // Omkar Hatti
  "ccb4fa03-15f0-4d86-a1d9-bbe698ea1fc5", // Nagaraj
  "d300d6e5-ce15-4a7f-9ce5-ae2947b36346"  // Nidhi
];

function initEnrollments() {
  try {
    if (fs.existsSync(ENROLLMENT_FILE)) {
      const raw = fs.readFileSync(ENROLLMENT_FILE, "utf8");
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([subId, stdArray]) => {
        enrollmentStore.set(subId, new Set(stdArray));
      });
      console.log(`Loaded enrollments for ${enrollmentStore.size} subjects from persistent disk storage.`);
    } else {
      // Seed default Deep Learning subject
      enrollmentStore.set(DEEP_LEARNING_ID, new Set(DEFAULT_STUDENT_IDS));
      saveEnrollmentsToDisk();
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
