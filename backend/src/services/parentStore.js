const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const PARENTS_FILE = path.join(__dirname, "../../persistent_parent_guardians.json");
const parentStore = new Map(); // Key: student_id -> array of guardian records

// Load persisted parent guardian records from disk on startup
try {
  if (fs.existsSync(PARENTS_FILE)) {
    const raw = fs.readFileSync(PARENTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([studentId, guardians]) => {
      parentStore.set(studentId, guardians);
    });
    console.log(`Loaded parent contacts for ${parentStore.size} students from disk.`);
  }
} catch (e) {
  console.warn("Failed to load persistent parent guardians file:", e.message);
}

function saveParentsToDisk() {
  try {
    const obj = {};
    for (const [studentId, guardians] of parentStore.entries()) {
      obj[studentId] = guardians;
    }
    fs.writeFileSync(PARENTS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save parent guardians to disk:", e.message);
  }
}

/**
 * Get all parent/guardian records for a specific student
 */
async function getStudentParents(studentId) {
  if (!studentId) return [];

  // Try DB first
  try {
    const { data, error } = await supabaseAdmin
      .from("parent_guardians")
      .select("*")
      .eq("student_id", studentId);

    if (!error && data && data.length > 0) {
      parentStore.set(studentId, data);
      saveParentsToDisk();
      return data;
    }
  } catch (e) {}

  // Fallback to memory store
  return parentStore.get(studentId) || [];
}

/**
 * Get primary parent/guardian for a student
 */
async function getPrimaryParent(studentId) {
  const parents = await getStudentParents(studentId);
  if (!parents || parents.length === 0) return null;
  const primary = parents.find((p) => p.is_primary) || parents[0];
  return primary || null;
}

/**
 * Save or update parent/guardian contact info for a student
 */
async function saveStudentParent(studentId, parentData) {
  if (!studentId) throw new Error("student_id is required");

  const existingParents = await getStudentParents(studentId);
  const now = new Date().toISOString();

  const isPrimary = parentData.is_primary !== false;

  // If this record is set as primary, unmark existing primary guardians for this student
  let updatedList = (existingParents || []).map((p) => {
    if (isPrimary) {
      return { ...p, is_primary: false };
    }
    return p;
  });

  const guardianId = parentData.id || `pg-${studentId}-${Date.now()}`;

  const newRecord = {
    id: guardianId,
    student_id: studentId,
    name: String(parentData.name || "").trim(),
    relationship: String(parentData.relationship || "Parent/Guardian").trim(),
    email: String(parentData.email || "").trim(),
    mobile: String(parentData.mobile || "").trim(),
    is_primary: isPrimary,
    email_enabled: parentData.email_enabled !== false,
    sms_enabled: Boolean(parentData.sms_enabled),
    created_at: parentData.created_at || now,
    updated_at: now,
  };

  const existingIdx = updatedList.findIndex((p) => p.id === guardianId || p.email === newRecord.email);
  if (existingIdx >= 0) {
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...newRecord };
  } else {
    updatedList.unshift(newRecord);
  }

  // Save to memory and disk
  parentStore.set(studentId, updatedList);
  saveParentsToDisk();

  // Try DB upsert
  try {
    await supabaseAdmin.from("parent_guardians").upsert(newRecord, { onConflict: "id" });
  } catch (e) {
    console.warn("Database parent_guardians upsert note:", e.message);
  }

  return newRecord;
}

/**
 * Get count of all students with configured primary parent contacts
 */
function getConfiguredParentsCount() {
  let count = 0;
  for (const [, guardians] of parentStore.entries()) {
    if (guardians && guardians.length > 0 && guardians.some((g) => g.email && g.email.trim().length > 0)) {
      count++;
    }
  }
  return count;
}

module.exports = {
  getStudentParents,
  getPrimaryParent,
  saveStudentParent,
  getConfiguredParentsCount,
};
