const fs = require("fs");
const path = require("path");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

const SECURITY_FILE = path.join(DATA_DIR, "persistent_exam_security.json");
const examSecurityList = [];

// Load persisted security records on startup
try {
  if (fs.existsSync(SECURITY_FILE)) {
    const raw = fs.readFileSync(SECURITY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      examSecurityList.push(...parsed);
    }
    console.log(`Loaded ${examSecurityList.length} persistent exam security records from disk.`);
  }
} catch (e) {
  console.warn("Failed to load exam security file:", e.message);
}

function saveSecurityToDisk() {
  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(examSecurityList, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save exam security to disk:", e.message);
  }
}

/**
 * Validate that code is either 4 or 6 characters/digits
 */
function isValidCode(code) {
  if (!code) return false;
  const str = String(code).trim();
  return str.length === 4 || str.length === 6;
}

/**
 * Set or update question paper security code
 */
async function setSecurityCode({ examId, code, authorId, authorRole }) {
  if (!examId) throw new Error("examId is required");
  const cleanCode = String(code || "").trim();
  if (!isValidCode(cleanCode)) {
    throw new Error("Security code must be exactly 4 or 6 digits / characters");
  }

  const existingIdx = examSecurityList.findIndex((item) => String(item.exam_id) === String(examId));
  const now = new Date().toISOString();

  let entry;
  if (existingIdx >= 0) {
    entry = examSecurityList[existingIdx];
    entry.security_code = cleanCode;
    entry.code_length = cleanCode.length;
    entry.updated_at = now;
    entry.updated_by = authorId || "faculty";
    entry.failed_attempts = 0;
    entry.locked_until = null;
  } else {
    entry = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      exam_id: String(examId),
      security_code: cleanCode,
      code_length: cleanCode.length,
      created_by: authorId || "faculty",
      created_at: now,
      updated_at: now,
      failed_attempts: 0,
      locked_until: null,
    };
    examSecurityList.push(entry);
  }

  saveSecurityToDisk();

  try {
    await logAuditEvent({
      userId: authorId || "faculty",
      userRole: authorRole || "faculty",
      action: "QUESTION_PAPER_SECURITY_CODE_SET",
      entityType: "exams",
      entityId: String(examId),
      newValue: `Passcode length: ${cleanCode.length}-digit`,
    });
  } catch (e) {}

  return {
    success: true,
    examId,
    codeLength: cleanCode.length,
    hasSecurityCode: true,
  };
}

/**
 * Check if an exam has a security code set
 */
function hasSecurityCode(examId) {
  if (!examId) return false;
  const entry = examSecurityList.find((item) => String(item.exam_id) === String(examId));
  return !!(entry && entry.security_code);
}

/**
 * Get security metadata for an exam (never returns raw passcode)
 */
function getSecurityStatus(examId) {
  if (!examId) return { hasSecurityCode: false, isSecured: false, codeLength: null };
  const entry = examSecurityList.find((item) => String(item.exam_id) === String(examId));
  if (!entry || !entry.security_code) {
    return {
      hasSecurityCode: false,
      isSecured: false,
      codeLength: null,
      updatedAt: null,
    };
  }
  return {
    hasSecurityCode: true,
    isSecured: true,
    codeLength: entry.code_length || entry.security_code.length,
    updatedAt: entry.updated_at || entry.created_at,
  };
}

/**
 * Verify input security code against saved exam passcode
 */
function verifySecurityCode(examId, inputCode) {
  if (!examId) {
    return { isProtected: false, verified: false, error: "Exam ID missing" };
  }
  const entry = examSecurityList.find((item) => String(item.exam_id) === String(examId));
  if (!entry || !entry.security_code) {
    // If not protected, allow access
    return { isProtected: false, verified: true };
  }

  // Check rate-limiting if too many failures
  if (entry.locked_until && Date.now() < entry.locked_until) {
    const remainingSec = Math.ceil((entry.locked_until - Date.now()) / 1000);
    return {
      isProtected: true,
      verified: false,
      rateLimited: true,
      error: `Too many failed attempts. Security lock active for ${remainingSec}s.`,
    };
  }

  const cleanInput = String(inputCode || "").trim();
  if (cleanInput === String(entry.security_code).trim()) {
    entry.failed_attempts = 0;
    entry.locked_until = null;
    saveSecurityToDisk();
    return { isProtected: true, verified: true };
  }

  // Failed attempt
  entry.failed_attempts = (entry.failed_attempts || 0) + 1;
  if (entry.failed_attempts >= 5) {
    entry.locked_until = Date.now() + 60000; // Lock for 60 seconds
  }
  saveSecurityToDisk();

  return {
    isProtected: true,
    verified: false,
    error: "Incorrect security code. Access denied.",
    attemptsLeft: Math.max(0, 5 - entry.failed_attempts),
  };
}

/**
 * Change or reset security code
 */
async function changeSecurityCode({ examId, oldCode, newCode, authorId, authorRole, isOwner }) {
  if (!examId) throw new Error("examId is required");
  const entry = examSecurityList.find((item) => String(item.exam_id) === String(examId));

  if (entry && entry.security_code && !isOwner) {
    // If not verified owner/admin, verify old code
    const cleanOld = String(oldCode || "").trim();
    if (cleanOld !== String(entry.security_code).trim()) {
      throw new Error("Previous security code is incorrect. Verification failed.");
    }
  }

  return setSecurityCode({ examId, code: newCode, authorId, authorRole });
}

module.exports = {
  setSecurityCode,
  hasSecurityCode,
  getSecurityStatus,
  verifySecurityCode,
  changeSecurityCode,
  isValidCode,
};

