const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const QP_FILE = path.join(DATA_DIR, "persistent_question_papers.json");
const memoryPapers = [];

// Load persistent question paper repository
try {
  if (fs.existsSync(QP_FILE)) {
    const raw = fs.readFileSync(QP_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryPapers.push(...parsed);
    console.log(`Loaded ${memoryPapers.length} question papers from disk.`);
  }
} catch (e) {
  console.warn("Failed to load question papers file:", e.message);
}

function savePapersToDisk() {
  try {
    fs.writeFileSync(QP_FILE, JSON.stringify(memoryPapers, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save question papers to disk:", e.message);
  }
}

/**
 * Get Question Papers repository (Confidential Exam Dept Only)
 */
async function getQuestionPapers({ examId, subjectId }) {
  let dbPapers = [];
  try {
    let query = supabaseAdmin
      .from("question_papers")
      .select("*, subjects(name, code, department_id, departments(name))")
      .order("created_at", { ascending: false });

    if (examId) query = query.eq("exam_id", examId);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (!error && data && data.length > 0) dbPapers = data;
  } catch (e) {}

  let list = dbPapers.length > 0 ? dbPapers : memoryPapers;
  if (examId) list = list.filter((p) => p.exam_id === examId);
  if (subjectId) list = list.filter((p) => p.subject_id === subjectId);

  return list;
}

/**
 * Add / Upload Question Paper to Repository
 */
async function registerQuestionPaper(payload, authorId) {
  const paperId = `qp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const paper = {
    id: paperId,
    exam_id: payload.exam_id || null,
    subject_id: payload.subject_id || null,
    subject_code: payload.subject_code || "MMC321",
    subject_name: payload.subject_name || "Main Exam Subject",
    paper_title: payload.paper_title || "Main Examination Question Paper",
    version: payload.version || "V1.0 (Final)",
    status: payload.status || "SECURED", // RECEIVED, UNDER_REVIEW, VERIFIED, APPROVED, SECURED, RELEASED_FOR_EXAM
    uploaded_by: authorId || "examdept",
    uploaded_at: new Date().toISOString(),
    verified_by: payload.status === "APPROVED" || payload.status === "SECURED" ? authorId : null,
    verified_at: payload.status === "APPROVED" || payload.status === "SECURED" ? new Date().toISOString() : null,
    file_path: payload.file_path || null,
  };

  memoryPapers.unshift(paper);
  savePapersToDisk();

  try {
    await supabaseAdmin.from("question_papers").insert(paper);
  } catch (e) {}

  await logAuditEvent({
    userId: authorId || "examdept",
    userRole: "examdept",
    action: "QUESTION_PAPER_REGISTERED",
    entityType: "question_papers",
    entityId: paperId,
    newValue: `Title: ${paper.paper_title}, Status: ${paper.status}`,
  });

  return paper;
}

/**
 * Update Question Paper Security Status
 */
async function updateQuestionPaperStatus(paperId, status, authorId) {
  const paper = memoryPapers.find((p) => p.id === paperId);
  if (paper) {
    paper.status = status;
    paper.updated_at = new Date().toISOString();
    savePapersToDisk();

    try {
      await supabaseAdmin.from("question_papers").update({ status, updated_at: paper.updated_at }).eq("id", paperId);
    } catch (e) {}

    await logAuditEvent({
      userId: authorId || "examdept",
      userRole: "examdept",
      action: "QUESTION_PAPER_STATUS_CHANGED",
      entityType: "question_papers",
      entityId: paperId,
      newValue: status,
    });

    return paper;
  }
  throw new Error("Question paper not found.");
}

module.exports = {
  getQuestionPapers,
  registerQuestionPaper,
  updateQuestionPaperStatus,
};
