const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const PRACTICE_FILE = path.join(DATA_DIR, "persistent_practice_attempts.json");
const memoryPractice = new Map(); // studentId -> array of practice attempt records

try {
  if (fs.existsSync(PRACTICE_FILE)) {
    const raw = fs.readFileSync(PRACTICE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([studentId, list]) => {
      memoryPractice.set(studentId, Array.isArray(list) ? list : []);
    });
    console.log(`Loaded persistent practice attempts for ${memoryPractice.size} students.`);
  }
} catch (e) {
  console.warn("Failed to load persistent practice attempts:", e.message);
}

function saveToDisk() {
  try {
    const obj = {};
    for (const [studentId, list] of memoryPractice.entries()) {
      obj[studentId] = list;
    }
    fs.writeFileSync(PRACTICE_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save practice attempts to disk:", e.message);
  }
}

async function getStudentPracticeHistory(studentId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("practice_attempts")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  return memoryPractice.get(studentId) || [];
}

async function recordPracticeAttempt(studentId, { subjectId, subjectName, score, totalQuestions, answers }) {
  const total = Number(totalQuestions || 5);
  const sc = Number(score || 0);
  const percentage = Math.round((sc / total) * 100);

  const attempt = {
    id: `prac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    student_id: studentId,
    subject_id: subjectId || null,
    subject: subjectName || "Subject Practice",
    score: sc,
    total: total,
    percentage: percentage,
    answers: answers || [],
    created_at: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
  };

  const list = memoryPractice.get(studentId) || [];
  const updated = [attempt, ...list];
  memoryPractice.set(studentId, updated);
  saveToDisk();

  try {
    await supabaseAdmin.from("practice_attempts").insert(attempt);
  } catch (e) {}

  return attempt;
}

module.exports = {
  getStudentPracticeHistory,
  recordPracticeAttempt,
};
