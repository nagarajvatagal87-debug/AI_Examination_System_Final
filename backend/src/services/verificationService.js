const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { supabaseAdmin } = require("../../config/Supabase");
const { logAuditEvent } = require("./auditService");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const VERIFICATION_FILE = path.join(DATA_DIR, "persistent_document_verifications.json");
const CONFIG_FILE = path.join(DATA_DIR, "persistent_verification_config.json");
const LOGS_FILE = path.join(DATA_DIR, "persistent_verification_logs.json");

const memoryVerifications = [];
const memoryLogs = [];

let verificationConfig = {
  HALL_TICKET: true,
  MARKS_CARD: true,
  RESULT_SHEET: true,
  ACADEMIC_REPORT: true,
  CERTIFICATE: true,
  ACHIEVEMENT_CERTIFICATE: true,
  SPORTS_CERTIFICATE: true,
  CLUB_CERTIFICATE: true,
};

// Helper load JSON file
function loadJson(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed reading ${filePath}:`, e.message);
  }
  return fallback;
}

// Helper save JSON file
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn(`Failed writing ${filePath}:`, e.message);
  }
}

// Initialize persistence
try {
  const loadedVerifs = loadJson(VERIFICATION_FILE, []);
  if (Array.isArray(loadedVerifs)) memoryVerifications.push(...loadedVerifs);

  const loadedConfig = loadJson(CONFIG_FILE, null);
  if (loadedConfig && typeof loadedConfig === "object") {
    verificationConfig = { ...verificationConfig, ...loadedConfig };
  }

  const loadedLogs = loadJson(LOGS_FILE, []);
  if (Array.isArray(loadedLogs)) memoryLogs.push(...loadedLogs);

  console.log(`Loaded ${memoryVerifications.length} document verification records and ${memoryLogs.length} logs.`);
} catch (e) {
  console.warn("Error initializing verification storage:", e.message);
}

function getVerificationConfig() {
  return { ...verificationConfig };
}

async function updateVerificationConfig(newConfig, userId) {
  verificationConfig = { ...verificationConfig, ...newConfig };
  saveJson(CONFIG_FILE, verificationConfig);

  await logAuditEvent({
    userId: userId || "system",
    userRole: "admin",
    action: "VERIFICATION_CONFIG_UPDATED",
    entityType: "verification_config",
    entityId: "global",
    newValue: JSON.stringify(verificationConfig),
  });

  return verificationConfig;
}

/**
 * Generate a SHA-256 hash for document content integrity
 */
function computeDocumentHash(content) {
  const text = typeof content === "object" ? JSON.stringify(content) : String(content || "");
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Create or fetch a QR-based document verification record
 */
async function createDocumentVerification({
  documentId,
  documentType,
  documentTitle,
  documentContent = {},
  studentId,
  studentName = "Student Candidate",
  usn = "N/A",
  issuerId = "system",
  issuerName = "Dayananda Sagar Academy of Technology and Management",
  departmentId = null,
  departmentName = "Department of Computer Applications",
  academicYear = "2025-2026",
  metadata = {},
}) {
  const normType = (documentType || "CERTIFICATE").toUpperCase().replace(/\s+/g, "_");

  // Check if QR verification is enabled for this document type
  if (verificationConfig[normType] === false) {
    return {
      enabled: false,
      message: `QR verification is currently disabled for ${normType}`,
    };
  }

  // Check if an existing valid verification record exists for this exact documentId, documentTitle, and student
  const targetTitle = documentTitle || "Official Academic Document";
  const existingIdx = memoryVerifications.findIndex(
    (v) => v.document_id === documentId &&
           v.document_title === targetTitle &&
           (v.issued_to_usn === usn || v.issued_to_student_id === studentId) &&
           v.status === "VALID"
  );

  let record;
  let rawToken;

  if (existingIdx !== -1) {
    record = memoryVerifications[existingIdx];
    rawToken = record.verification_token;
  } else {
    // Generate a cryptographically secure random verification token (32 bytes hex = 64 chars)
    rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const docHash = computeDocumentHash(documentContent);

    const publicVerificationRef = `DSATM-VER-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    record = {
      id: `docver-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      document_id: documentId || `doc-${Date.now()}`,
      document_type: normType,
      document_title: documentTitle || "Official Academic Document",
      document_hash: docHash,
      verification_token: rawToken,
      verification_token_hash: tokenHash,
      public_verification_id: publicVerificationRef,
      issued_to_student_id: studentId || "student",
      issued_to_student_name: studentName,
      issued_to_usn: usn,
      issued_by_user_id: issuerId,
      issued_by_name: issuerName,
      department_id: departmentId,
      department_name: departmentName,
      academic_year: academicYear,
      version: 1,
      status: "VALID", // VALID, REVOKED, EXPIRED, SUPERSEDED
      revoked_at: null,
      revoked_reason: null,
      expires_at: null,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryVerifications.unshift(record);
    saveJson(VERIFICATION_FILE, memoryVerifications);

    // Try storing to Supabase
    try {
      await supabaseAdmin.from("document_verifications").insert({
        id: record.id,
        document_id: record.document_id,
        document_type: record.document_type,
        document_hash: record.document_hash,
        verification_token_hash: record.verification_token_hash,
        issued_to_student_id: record.issued_to_student_id,
        issued_by_user_id: record.issued_by_user_id,
        department_id: record.department_id,
        academic_year: record.academic_year,
        status: record.status,
        version: record.version,
        created_at: record.created_at,
      });
    } catch (e) {}

    await logAuditEvent({
      userId: issuerId,
      userRole: "issuer",
      action: "DOCUMENT_VERIFICATION_CREATED",
      entityType: "document_verification",
      entityId: record.id,
      newValue: `DocType: ${normType}, USN: ${usn}, Ref: ${publicVerificationRef}`,
    });
  }

  // Construct secure public verification URL
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const verificationUrl = `${frontendOrigin}/verify/document/${rawToken}`;

  // Generate QR Code Data URL (High Resolution PNG base64 Data URL)
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 280,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return {
    enabled: true,
    verificationRecordId: record.id,
    publicVerificationId: record.public_verification_id,
    token: rawToken,
    verificationUrl,
    qrDataUrl,
    documentHash: record.document_hash,
    status: record.status,
    version: record.version,
    issuedAt: record.created_at,
  };
}

/**
 * Validate a verification token for the public verification endpoint (No auth required)
 */
async function verifyDocumentToken(token, userAgent = "Unknown", ipAddress = "127.0.0.1") {
  if (!token || typeof token !== "string" || token.length < 8) {
    return {
      status: "INVALID",
      message: "Unable to verify this document. Verification token is missing or malformed.",
    };
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  let record = memoryVerifications.find(
    (v) => v.verification_token === token || v.verification_token_hash === tokenHash
  );

  if (!record) {
    try {
      const { data } = await supabaseAdmin
        .from("document_verifications")
        .select("*")
        .eq("verification_token_hash", tokenHash)
        .maybeSingle();
      if (data) record = data;
    } catch (e) {}
  }

  const logEntry = {
    id: `verlog-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    verification_id: record ? record.id : null,
    document_id: record ? record.document_id : null,
    verification_time: new Date().toISOString(),
    result: record ? record.status : "INVALID",
    user_agent: userAgent,
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
  };

  memoryLogs.unshift(logEntry);
  saveJson(LOGS_FILE, memoryLogs.slice(0, 1000));

  try {
    await supabaseAdmin.from("document_verification_logs").insert({
      verification_id: logEntry.verification_id,
      document_id: logEntry.document_id,
      result: logEntry.result,
      user_agent: logEntry.user_agent,
      ip_address: logEntry.ip_address,
      created_at: logEntry.created_at,
    });
  } catch (e) {}

  if (!record) {
    return {
      status: "INVALID",
      message: "Unable to verify this document. No matching official record was found in the college system.",
    };
  }

  // Format safe public display payload (No passwords, private emails, phone, or internal AI logs exposed!)
  const rawName = record.issued_to_student_name;
  const publicStudentName = (rawName && rawName !== "Student Candidate" && rawName !== "N/A" && rawName !== "Ananya Sharma") ? rawName : "Authorized Student";
  const rawUsn = record.issued_to_usn;
  const publicUsn = (rawUsn && rawUsn !== "N/A" && rawUsn !== "USN-UNKNOWN" && rawUsn !== "1DT22MC045") ? rawUsn : "USN Pending";

  if (record.status === "REVOKED") {
    return {
      status: "REVOKED",
      publicVerificationId: record.public_verification_id,
      documentType: record.document_type,
      documentTitle: record.document_title,
      issuedBy: record.issued_by_name || "Dayananda Sagar Academy of Technology and Management",
      studentName: publicStudentName,
      usn: publicUsn,
      departmentName: record.department_name,
      academicYear: record.academic_year,
      issuedAt: record.created_at,
      revokedAt: record.revoked_at,
      revokedReason: record.revoked_reason || "Document has been revoked by institutional authority.",
      message: "This document is no longer considered valid by the institution.",
    };
  }

  if (record.status === "SUPERSEDED") {
    return {
      status: "SUPERSEDED",
      publicVerificationId: record.public_verification_id,
      documentType: record.document_type,
      documentTitle: record.document_title,
      issuedBy: record.issued_by_name || "Dayananda Sagar Academy of Technology and Management",
      studentName: publicStudentName,
      usn: publicUsn,
      departmentName: record.department_name,
      academicYear: record.academic_year,
      issuedAt: record.created_at,
      version: record.version,
      message: "This document version has been superseded by a newer official record issued by the institution.",
    };
  }

  if (record.status === "EXPIRED") {
    return {
      status: "EXPIRED",
      publicVerificationId: record.public_verification_id,
      documentType: record.document_type,
      documentTitle: record.document_title,
      issuedBy: record.issued_by_name || "Dayananda Sagar Academy of Technology and Management",
      studentName: publicStudentName,
      usn: publicUsn,
      departmentName: record.department_name,
      academicYear: record.academic_year,
      issuedAt: record.created_at,
      expiredAt: record.expires_at,
      message: "This document has reached its configured expiration date.",
    };
  }

  return {
    status: "VALID",
    publicVerificationId: record.public_verification_id,
    documentType: record.document_type,
    documentTitle: record.document_title,
    issuedBy: record.issued_by_name || "Dayananda Sagar Academy of Technology and Management",
    studentName: publicStudentName,
    usn: publicUsn,
    departmentName: record.department_name,
    academicYear: record.academic_year,
    issuedAt: record.created_at,
    version: record.version,
    documentHash: record.document_hash,
    metadata: {
      examTitle: record.metadata?.examTitle || record.metadata?.title,
      subjectName: record.metadata?.subjectName,
      grade: record.metadata?.grade,
      eventName: record.metadata?.eventName,
      category: record.metadata?.category,
    },
    message: "✓ Document Verified. Issued by Dayananda Sagar Academy of Technology and Management.",
  };
}

/**
 * Revoke a document verification record
 */
async function revokeDocument({ documentId, token, reason, userId, userRole }) {
  let record = memoryVerifications.find(
    (v) => (documentId && v.document_id === documentId) || (token && v.verification_token === token)
  );

  if (!record) {
    throw new Error("Document verification record not found.");
  }

  record.status = "REVOKED";
  record.revoked_at = new Date().toISOString();
  record.revoked_reason = reason || "Revoked by institutional authority.";
  record.updated_at = new Date().toISOString();

  saveJson(VERIFICATION_FILE, memoryVerifications);

  try {
    await supabaseAdmin
      .from("document_verifications")
      .update({ status: "REVOKED", updated_at: record.updated_at })
      .eq("id", record.id);
  } catch (e) {}

  await logAuditEvent({
    userId: userId || "admin",
    userRole: userRole || "admin",
    action: "DOCUMENT_REVOKED",
    entityType: "document_verification",
    entityId: record.id,
    newValue: `Reason: ${record.revoked_reason}`,
  });

  return record;
}

/**
 * Handle document versioning when results change (e.g. revaluation)
 */
async function supersedeDocumentVersion({
  oldDocumentId,
  newDocumentId,
  documentType,
  documentTitle,
  newDocumentContent,
  studentId,
  studentName,
  usn,
  userId,
  metadata = {},
}) {
  const oldIdx = memoryVerifications.findIndex(
    (v) => v.document_id === oldDocumentId && (v.status === "VALID" || v.status === "SUPERSEDED")
  );

  let prevVersion = 1;
  if (oldIdx !== -1) {
    memoryVerifications[oldIdx].status = "SUPERSEDED";
    memoryVerifications[oldIdx].updated_at = new Date().toISOString();
    prevVersion = memoryVerifications[oldIdx].version || 1;
  }

  const newVersion = prevVersion + 1;

  const newRecord = await createDocumentVerification({
    documentId: newDocumentId,
    documentType,
    documentTitle: `${documentTitle} (v${newVersion})`,
    documentContent: newDocumentContent,
    studentId,
    studentName,
    usn,
    issuerId: userId,
    metadata: { ...metadata, prevDocumentId: oldDocumentId, version: newVersion },
  });

  newRecord.version = newVersion;
  const matchIdx = memoryVerifications.findIndex((v) => v.document_id === newDocumentId);
  if (matchIdx !== -1) {
    memoryVerifications[matchIdx].version = newVersion;
    saveJson(VERIFICATION_FILE, memoryVerifications);
  }

  await logAuditEvent({
    userId: userId || "system",
    userRole: "admin",
    action: "DOCUMENT_SUPERSEDED_NEW_VERSION_ISSUED",
    entityType: "document_verification",
    entityId: newDocumentId,
    oldValue: `Old Doc ID: ${oldDocumentId} (Superseded)`,
    newValue: `New Doc ID: ${newDocumentId} (v${newVersion} Valid)`,
  });

  return newRecord;
}

/**
 * Fetch verification audit records & access logs for Admin dashboards
 */
async function getVerificationRecordsAndLogs({ limit = 50 }) {
  return {
    records: memoryVerifications.slice(0, limit),
    logs: memoryLogs.slice(0, limit),
    config: getVerificationConfig(),
  };
}

module.exports = {
  getVerificationConfig,
  updateVerificationConfig,
  computeDocumentHash,
  createDocumentVerification,
  verifyDocumentToken,
  revokeDocument,
  supersedeDocumentVersion,
  getVerificationRecordsAndLogs,
};
