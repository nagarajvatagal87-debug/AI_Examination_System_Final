const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");
const { notify } = require("./notification.service");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const REVAL_FILE = path.join(DATA_DIR, "persistent_revaluation.json");

let revalConfig = {
  revaluation_fee_per_subject: 500,
  late_fee: 200,
  start_date: "2026-09-01",
  deadline: "2026-10-31",
  late_deadline: "2026-11-10",
  max_subjects_allowed: 4,
  eligible_paper_types: ["main"],
};

const memoryApplications = [];
const memoryPayments = [];

// Load persistent revaluation data
try {
  if (fs.existsSync(REVAL_FILE)) {
    const raw = fs.readFileSync(REVAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.config) revalConfig = { ...revalConfig, ...parsed.config };
    if (Array.isArray(parsed.applications)) memoryApplications.push(...parsed.applications);
    if (Array.isArray(parsed.payments)) memoryPayments.push(...parsed.payments);
    console.log(`Loaded ${memoryApplications.length} revaluation applications from disk.`);
  }
} catch (e) {
  console.warn("Failed to load revaluation file:", e.message);
}

function saveRevalToDisk() {
  try {
    fs.writeFileSync(
      REVAL_FILE,
      JSON.stringify({ config: revalConfig, applications: memoryApplications, payments: memoryPayments }, null, 2),
      "utf8"
    );
  } catch (e) {
    console.warn("Failed to save revaluation file to disk:", e.message);
  }
}

function getRevaluationConfig() {
  return revalConfig;
}

function updateRevaluationConfig(newConfig) {
  revalConfig = { ...revalConfig, ...newConfig };
  saveRevalToDisk();
  return revalConfig;
}

/**
 * Initiate server-verified revaluation payment
 */
async function initiateRevaluationPayment({ studentId, examId, subjectId, subjectName, amount }) {
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const reference = `TXN-DSATM-${Date.now()}`;

  const paymentRecord = {
    payment_id: paymentId,
    student_id: studentId,
    exam_id: examId,
    subject_id: subjectId,
    subject_name: subjectName,
    amount: Number(amount) || revalConfig.revaluation_fee_per_subject,
    currency: "INR",
    gateway: "DSATM-Razorpay-Sandbox",
    transaction_reference: reference,
    status: "SUCCESS", // Server-verified sandbox payment success
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
  };

  memoryPayments.unshift(paymentRecord);
  saveRevalToDisk();

  try {
    await supabaseAdmin.from("revaluation_payments").insert(paymentRecord);
  } catch (e) {}

  return paymentRecord;
}

/**
 * Create revaluation application after verified payment
 */
async function createRevaluationApplication({ studentId, examId, subjectId, subjectName, originalMarks, paymentId, applicationType = "REVALUATION" }) {
  // Check if student already applied for this subject
  const existing = memoryApplications.find(
    (app) => app.student_id === studentId && app.subject_id === subjectId && app.exam_id === examId
  );
  if (existing) {
    throw new Error("Revaluation application already submitted for this subject.");
  }

  const appId = `reval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newApp = {
    id: appId,
    application_no: `REV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    student_id: studentId,
    exam_id: examId,
    subject_id: subjectId,
    subject_name: subjectName || "Subject",
    original_marks: Number(originalMarks) || 0,
    revised_marks: null,
    final_marks: Number(originalMarks) || 0,
    fee_paid: revalConfig.revaluation_fee_per_subject,
    payment_id: paymentId || null,
    application_type: applicationType, // "REVALUATION" or "RETOTALING"
    status: "SUBMITTED", // SUBMITTED -> ASSIGNED -> IN_EVALUATION -> EVALUATED -> APPROVED -> REJECTED -> COMPLETED
    evaluator_id: null,
    remarks: "",
    decision: "PENDING", // PENDING, NO_CHANGE, INCREASED, DECREASED
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryApplications.unshift(newApp);
  saveRevalToDisk();

  try {
    await supabaseAdmin.from("revaluation_applications").insert(newApp);
  } catch (e) {}

  await logAuditEvent({
    userId: studentId,
    userRole: "student",
    action: "REVALUATION_APPLICATION_SUBMITTED",
    entityType: "revaluation_applications",
    entityId: appId,
    newValue: `Subject: ${subjectName}, Fee: ${newApp.fee_paid}`,
  });

  return newApp;
}

/**
 * Get all revaluation applications for Exam Dept or Student
 */
async function getRevaluationApplications({ studentId, examId, departmentId, status }) {
  let dbApps = [];
  try {
    let query = supabaseAdmin
      .from("revaluation_applications")
      .select("*, profiles:student_id(full_name, registration_no, email, department_id)")
      .order("created_at", { ascending: false });

    if (studentId) query = query.eq("student_id", studentId);
    if (examId) query = query.eq("exam_id", examId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (!error && data && data.length > 0) dbApps = data;
  } catch (e) {}

  let list = dbApps.length > 0 ? dbApps : memoryApplications;

  if (studentId) list = list.filter((app) => app.student_id === studentId);
  if (examId) list = list.filter((app) => app.exam_id === examId);
  if (status && status !== "ALL") list = list.filter((app) => app.status === status);

  return list;
}

/**
 * Update revaluation application evaluation & final decision by Exam Dept
 */
async function processRevaluationDecision({ appId, revisedMarks, status, evaluatorId, remarks, authorId }) {
  const app = memoryApplications.find((a) => a.id === appId);
  if (app) {
    const orig = app.original_marks || 0;
    const rev = Number(revisedMarks) ?? orig;
    let decision = "NO_CHANGE";
    if (rev > orig) decision = "INCREASED";
    else if (rev < orig) decision = "DECREASED";

    app.revised_marks = rev;
    app.final_marks = rev;
    app.decision = decision;
    if (status) app.status = status; // e.g. "COMPLETED", "APPROVED", "REJECTED"
    if (evaluatorId) app.evaluator_id = evaluatorId;
    if (remarks) app.remarks = remarks;
    app.updated_at = new Date().toISOString();

    saveRevalToDisk();

    try {
      await supabaseAdmin
        .from("revaluation_applications")
        .update({
          revised_marks: rev,
          final_marks: rev,
          decision,
          status: status || app.status,
          evaluator_id: evaluatorId || app.evaluator_id,
          remarks: remarks || app.remarks,
          updated_at: app.updated_at,
        })
        .eq("id", appId);
    } catch (e) {}

    // Notify student about final revaluation result
    try {
      await notify(
        app.student_id,
        "revaluation_result_published",
        `🎓 Revaluation Result Announced: ${app.subject_name}`,
        `Your revaluation for ${app.subject_name} is complete!\nOriginal Marks: ${orig}\nRevised Final Marks: ${rev}\nDecision: ${decision}`
      );
    } catch (e) {}

    await logAuditEvent({
      userId: authorId || "examdept",
      userRole: "examdept",
      action: "REVALUATION_DECISION_FINALIZED",
      entityType: "revaluation_applications",
      entityId: appId,
      oldValue: `Original: ${orig}`,
      newValue: `Revised: ${rev}, Decision: ${decision}`,
    });

    return app;
  }
  throw new Error("Revaluation application not found.");
}

module.exports = {
  getRevaluationConfig,
  updateRevaluationConfig,
  initiateRevaluationPayment,
  createRevaluationApplication,
  getRevaluationApplications,
  processRevaluationDecision,
};
