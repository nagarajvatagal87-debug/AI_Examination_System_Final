const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const AUDIT_FILE = path.join(DATA_DIR, "persistent_audit_logs.json");
const memoryAuditLogs = [];

// Load persistent audit logs on startup
try {
  if (fs.existsSync(AUDIT_FILE)) {
    const raw = fs.readFileSync(AUDIT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryAuditLogs.push(...parsed);
    }
    console.log(`Loaded ${memoryAuditLogs.length} persistent audit logs from disk.`);
  }
} catch (e) {
  console.warn("Failed to load audit logs file:", e.message);
}

function saveAuditLogsToDisk() {
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(memoryAuditLogs.slice(0, 1000), null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save audit logs to disk:", e.message);
  }
}

/**
 * Log an immutable audit event for important academic operations
 */
async function logAuditEvent({ userId, userRole, action, entityType, entityId, oldValue, newValue, reason, departmentId }) {
  const logEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    user_role: userRole || "user",
    action, // e.g. "MARK_UPDATED", "INTERNAL_EXAM_APPROVED", "FACULTY_ASSIGNED", "COURSE_MATERIAL_UPLOADED"
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue !== undefined ? oldValue : null,
    new_value: newValue !== undefined ? newValue : null,
    reason: reason || "",
    department_id: departmentId || null,
    created_at: new Date().toISOString(),
  };

  memoryAuditLogs.unshift(logEntry);
  saveAuditLogsToDisk();

  // Try saving to Supabase database audit_logs table
  try {
    await supabaseAdmin.from("audit_logs").insert(logEntry);
  } catch (e) {
    // Database table missing fallback handled by memoryAuditLogs
  }

  return logEntry;
}

/**
 * Fetch audit logs for a department or user
 */
async function getAuditLogs({ departmentId, userId, limit = 50 }) {
  let dbLogs = [];
  try {
    let query = supabaseAdmin.from("audit_logs").select("*, profiles:user_id(full_name, email, role)").order("created_at", { ascending: false }).limit(limit);
    if (departmentId) query = query.eq("department_id", departmentId);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbLogs = data;
    }
  } catch (e) {}

  if (dbLogs.length > 0) {
    return dbLogs;
  }

  // Filter memory logs
  let filtered = memoryAuditLogs;
  if (departmentId) {
    filtered = filtered.filter((l) => !l.department_id || l.department_id === departmentId);
  }
  if (userId) {
    filtered = filtered.filter((l) => l.user_id === userId);
  }

  return filtered.slice(0, limit);
}

module.exports = {
  logAuditEvent,
  getAuditLogs,
};
