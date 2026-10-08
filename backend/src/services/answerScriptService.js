const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const SCRIPT_FILE = path.join(DATA_DIR, "persistent_answer_scripts.json");
const memoryScripts = [];

// Load persistent answer script tracking from disk
try {
  if (fs.existsSync(SCRIPT_FILE)) {
    const raw = fs.readFileSync(SCRIPT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryScripts.push(...parsed);
    console.log(`Loaded ${memoryScripts.length} answer script tracking records from disk.`);
  }
} catch (e) {
  console.warn("Failed to load answer script tracking file:", e.message);
}

function saveScriptsToDisk() {
  try {
    fs.writeFileSync(SCRIPT_FILE, JSON.stringify(memoryScripts, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save answer script tracking to disk:", e.message);
  }
}

/**
 * Register received answer script
 */
async function registerAnswerScript(payload, authorId) {
  const scriptId = `script-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const script = {
    id: scriptId,
    exam_id: payload.exam_id,
    subject_id: payload.subject_id,
    student_id: payload.student_id,
    student_name: payload.student_name || "Student",
    usn: payload.usn || "USN101",
    total_pages: Number(payload.total_pages) || 16,
    received_date: payload.received_date || new Date().toISOString().split("T")[0],
    received_by: authorId || "Exam Dept Receiving Counter",
    status: payload.status || "RECEIVED", // NOT_RECEIVED, RECEIVED, SCANNED, UPLOADED, ASSIGNED, IN_EVALUATION, EVALUATED, VERIFIED, MISSING
    scanned_file_path: payload.scanned_file_path || null,
    created_at: new Date().toISOString(),
  };

  const existingIdx = memoryScripts.findIndex(
    (s) => s.student_id === payload.student_id && s.exam_id === payload.exam_id
  );
  if (existingIdx !== -1) memoryScripts[existingIdx] = script;
  else memoryScripts.unshift(script);

  saveScriptsToDisk();

  try {
    await supabaseAdmin.from("answer_script_tracking").upsert(script, { onConflict: "exam_id,student_id" });
  } catch (e) {}

  await logAuditEvent({
    userId: authorId || "examdept",
    userRole: "examdept",
    action: "ANSWER_SCRIPT_REGISTERED",
    entityType: "answer_script_tracking",
    entityId: scriptId,
    newValue: `Student USN: ${script.usn}, Status: ${script.status}`,
  });

  return script;
}

/**
 * Get script tracking & missing scripts summary for Exam Dept
 */
async function getScriptTrackingSummary({ examId, departmentId, status }) {
  let dbScripts = [];
  try {
    let query = supabaseAdmin
      .from("answer_script_tracking")
      .select("*, profiles:student_id(full_name, registration_no, department_id, departments!profiles_department_fk(name))")
      .order("created_at", { ascending: false });

    if (examId) query = query.eq("exam_id", examId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (!error && data && data.length > 0) dbScripts = data;
  } catch (e) {}

  let list = dbScripts.length > 0 ? dbScripts : memoryScripts;
  if (examId) list = list.filter((s) => s.exam_id === examId);
  if (status && status !== "ALL") list = list.filter((s) => s.status === status);

  const receivedCount = list.filter((s) => s.status !== "NOT_RECEIVED" && s.status !== "MISSING").length;
  const missingCount = list.filter((s) => s.status === "MISSING" || s.status === "NOT_RECEIVED").length;
  const evaluatedCount = list.filter((s) => s.status === "EVALUATED" || s.status === "VERIFIED").length;

  return {
    totalExpected: list.length,
    receivedCount,
    missingCount,
    evaluatedCount,
    scripts: list,
    missingScripts: list.filter((s) => s.status === "MISSING" || s.status === "NOT_RECEIVED"),
  };
}

/**
 * Update script status (e.g. mark as MISSING or VERIFIED after physical audit)
 */
async function updateScriptStatus({ scriptId, status, remarks, authorId }) {
  const script = memoryScripts.find((s) => s.id === scriptId);
  if (script) {
    const oldStatus = script.status;
    script.status = status;
    script.remarks = remarks || script.remarks;
    script.updated_at = new Date().toISOString();

    saveScriptsToDisk();

    try {
      await supabaseAdmin
        .from("answer_script_tracking")
        .update({ status, remarks: script.remarks, updated_at: script.updated_at })
        .eq("id", scriptId);
    } catch (e) {}

    await logAuditEvent({
      userId: authorId || "examdept",
      userRole: "examdept",
      action: "ANSWER_SCRIPT_STATUS_UPDATED",
      entityType: "answer_script_tracking",
      entityId: scriptId,
      oldValue: oldStatus,
      newValue: `New Status: ${status}, Remarks: ${remarks || "None"}`,
    });

    return script;
  }
  throw new Error("Script record not found.");
}

module.exports = {
  registerAnswerScript,
  getScriptTrackingSummary,
  updateScriptStatus,
};
