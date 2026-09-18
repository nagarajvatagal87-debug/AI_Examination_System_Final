const express = require("express");
const multer = require("multer");
const axios = require("axios");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/answers/upload  (multipart: file, examId, studentId)
router.post("/upload", requireAuth, requireRole("faculty"), upload.single("file"), async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    const file = req.file;
    if (!file || !examId || !studentId) {
      return res.status(400).json({ error: "file, examId and studentId are required" });
    }

    const path = `answers/${examId}/${studentId}-${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    const { data: submission, error } = await supabaseAdmin
      .from("answer_submissions")
      .insert({
        exam_id: examId,
        student_id: studentId,
        scanned_file_path: path,
        status: "uploaded",
        uploaded_by: req.user.id,
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(submission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/answers/:submissionId/process -> trigger OCR + evaluation via the Python ai-service
router.post("/:submissionId/process", requireAuth, requireRole("faculty"), async (req, res) => {
  try {
    const { submissionId } = req.params;

    const { data: submission, error } = await supabaseAdmin
      .from("answer_submissions").select("*").eq("id", submissionId).single();
    if (error) throw error;

    await supabaseAdmin
      .from("answer_submissions")
      .update({ status: "ocr_pending" })
      .eq("id", submissionId);

    const { data: result } = await axios.post(
      `${process.env.GENAI_SERVICE_URL}/agents/process-submission`,
      { submission_id: submissionId, scanned_file_path: submission.scanned_file_path, exam_id: submission.exam_id },
      { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error || err.message });
  }
});

module.exports = router;