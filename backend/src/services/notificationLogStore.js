const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const LOGS_FILE = path.join(DATA_DIR, "persistent_notification_logs.json");
const logsStore = []; // Array of notification log records

// Load persisted notification logs from disk on startup
try {
  if (fs.existsSync(LOGS_FILE)) {
    const raw = fs.readFileSync(LOGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      logsStore.push(...parsed);
    }
    console.log(`Loaded ${logsStore.length} persistent notification logs from disk.`);
  }
} catch (e) {
  console.warn("Failed to load persistent notification logs file:", e.message);
}

function saveLogsToDisk() {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logsStore, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save notification logs to disk:", e.message);
  }
}

/**
 * Log a notification event (Email or SMS)
 */
async function createNotificationLog(data) {
  const now = new Date().toISOString();
  const logRecord = {
    id: data.id || `notif-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    student_id: data.student_id,
    parent_id: data.parent_id || null,
    attendance_id: data.attendance_id || null,
    channel: data.channel || "EMAIL",
    notification_type: data.notification_type || "ATTENDANCE_ABSENCE",
    recipient: data.recipient,
    subject: data.subject,
    message: data.message,
    status: data.status || "SENT", // SENT | FAILED | PENDING
    provider_message_id: data.provider_message_id || null,
    created_at: now,
    sent_at: data.status === "SENT" ? now : null,
    failure_reason: data.failure_reason || null,
  };

  logsStore.unshift(logRecord);
  saveLogsToDisk();

  // Try DB insert
  try {
    await supabaseAdmin.from("notification_logs").insert(logRecord);
  } catch (e) {
    console.warn("Database notification_logs insert note:", e.message);
  }

  return logRecord;
}

/**
 * Check if a duplicate absence notification was already sent today for student & date session
 */
function isDuplicateAbsenceEmailSent(studentId, dateStr, parentId) {
  const todayPrefix = dateStr || new Date().toISOString().split("T")[0];
  return logsStore.some(
    (log) =>
      log.student_id === studentId &&
      log.notification_type === "ATTENDANCE_ABSENCE" &&
      log.status === "SENT" &&
      (log.parent_id === parentId || !parentId) &&
      (log.created_at || "").startsWith(todayPrefix)
  );
}

/**
 * Get notification summary stats for HOD & analytics
 */
function getLogsAnalytics() {
  const totalSent = logsStore.filter((l) => l.status === "SENT").length;
  const totalFailed = logsStore.filter((l) => l.status === "FAILED").length;
  const totalAbsenceNotifs = logsStore.filter((l) => l.notification_type === "ATTENDANCE_ABSENCE").length;

  return {
    totalSent,
    totalFailed,
    totalAbsenceNotifs,
    logs: logsStore.slice(0, 50),
  };
}

module.exports = {
  createNotificationLog,
  isDuplicateAbsenceEmailSent,
  getLogsAnalytics,
};
