const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  getVerificationConfig,
  updateVerificationConfig,
  createDocumentVerification,
  revokeDocument,
  getVerificationRecordsAndLogs,
} = require("../services/verificationService");

const router = express.Router();

// GET /api/verification/config -> fetch QR verification configuration (enabled/disabled per doc type)
router.get("/config", requireAuth, async (req, res) => {
  try {
    const config = getVerificationConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/verification/config -> update QR verification settings (Admin / Exam Dept / HOD / Principal)
router.post("/config", requireAuth, requireRole("examdept", "principal", "hod", "faculty"), async (req, res) => {
  try {
    const newConfig = await updateVerificationConfig(req.body, req.user.id);
    res.json(newConfig);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/verification/generate -> Generate QR verification record for a document
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const {
      documentId,
      documentType,
      documentTitle,
      documentContent,
      studentId,
      studentName,
      usn,
      departmentId,
      departmentName,
      academicYear,
      metadata,
    } = req.body;

    let userFullName = req.user.full_name || req.user.fullName;
    let userRegistrationNo = req.user.registration_no || req.user.registrationNo || req.user.usn;

    const resolvedUsn = (usn && usn !== "N/A" && usn !== "USN-UNKNOWN" && usn !== "1DT22MC045") 
      ? usn 
      : (userRegistrationNo || "USN Pending");
      
    const resolvedName = (studentName && studentName !== "Student Candidate" && studentName !== "N/A" && studentName !== "Ananya Sharma") 
      ? studentName 
      : (userFullName || "Authorized Student");

    const result = await createDocumentVerification({
      documentId,
      documentType,
      documentTitle,
      documentContent,
      studentId: studentId || req.user.id,
      studentName: resolvedName,
      usn: resolvedUsn,
      issuerId: req.user.id,
      issuerName: req.user.full_name || "Dayananda Sagar Academy of Technology and Management",
      departmentId,
      departmentName: departmentName || "Department of Computer Applications (MCA)",
      academicYear: academicYear || "2026-2027",
      metadata,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/verification/revoke -> Revoke a document (Exam Dept / Principal / HOD)
router.post("/revoke", requireAuth, requireRole("examdept", "principal", "hod"), async (req, res) => {
  try {
    const { documentId, token, reason } = req.body;
    const result = await revokeDocument({
      documentId,
      token,
      reason,
      userId: req.user.id,
      userRole: req.user.role,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/verification/audit -> View verification records & access logs for administrative oversight
router.get("/audit", requireAuth, requireRole("examdept", "principal", "hod", "faculty"), async (req, res) => {
  try {
    const data = await getVerificationRecordsAndLogs({ limit: 100 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
