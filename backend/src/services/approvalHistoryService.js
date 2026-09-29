const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const HISTORY_FILE = path.join(__dirname, "../../persistent_approval_history.json");
const memoryApprovalHistory = [];

// Load persistent approval history on startup
try {
  if (fs.existsSync(HISTORY_FILE)) {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryApprovalHistory.push(...parsed);
    }
    console.log(`Loaded ${memoryApprovalHistory.length} persistent approval history logs from disk.`);
  }
} catch (e) {
  console.warn("Failed to load approval history file:", e.message);
}

function saveHistoryToDisk() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(memoryApprovalHistory, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save approval history to disk:", e.message);
  }
}

async function recordApprovalHistory({ examId, subjectId, submittedBy, reviewedBy, status, action, comments }) {
  const entry = {
    id: `apph-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    exam_id: examId || null,
    subject_id: subjectId,
    submitted_by: submittedBy || null,
    reviewed_by: reviewedBy || null,
    status: status || "SUBMITTED", // DRAFT, SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, APPROVED, FORWARDED, REJECTED
    action: action || "Marks Submitted for Review",
    comments: comments || "",
    created_at: new Date().toISOString(),
  };

  memoryApprovalHistory.unshift(entry);
  saveHistoryToDisk();

  try {
    await supabaseAdmin.from("internal_exam_approval_history").insert(entry);
  } catch (e) {}

  return entry;
}

async function getApprovalHistory(subjectId) {
  let dbHistory = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("internal_exam_approval_history")
      .select("*, submitter:submitted_by(full_name, email), reviewer:reviewed_by(full_name, email)")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      dbHistory = data;
    }
  } catch (e) {}

  if (dbHistory.length > 0) {
    return dbHistory;
  }

  return memoryApprovalHistory.filter((h) => h.subject_id === subjectId);
}

module.exports = {
  recordApprovalHistory,
  getApprovalHistory,
};
