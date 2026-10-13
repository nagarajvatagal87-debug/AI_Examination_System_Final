
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");

const { supabaseAdmin } = require("../../config/Supabase");
const {
  requireAuth,
  requireRole,
} = require("../middleware/auth.js");

const router = express.Router();

// --------------------------------------------------
// Upload configuration
// --------------------------------------------------

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
      const error = new Error("Only PDF answer papers are allowed.");
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getAIServiceUrl() {
  // Supports both environment variable names.
  const configuredUrl =
    process.env.AI_SERVICE_URL ||
    process.env.GENAI_SERVICE_URL;

  if (!configuredUrl) {
    const error = new Error(
      "AI service URL is not configured in the backend environment."
    );
    error.status = 500;
    throw error;
  }

  return configuredUrl.replace(/\/+$/, "");
}

function getAIServiceHeaders() {
  const apiKey = process.env.GENAI_SERVICE_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "AI service authentication key is not configured."
    );
    error.status = 500;
    throw error;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "The PDF exceeds the 20 MB upload limit."
        : error.message;

    return res.status(400).json({ error: message });
  }

  const status =
    error.status ||
    error.response?.status ||
    500;

  // Log technical details on the server, never API keys.
  console.error("[Answer API]", {
    message: error.message,
    upstreamStatus: error.response?.status,
  });

  const upstreamMessage =
    error.response?.data?.detail ||
    error.response?.data?.error;

  return res.status(status).json({
    error:
      typeof upstreamMessage === "string"
        ? upstreamMessage
        : status >= 500
          ? fallbackMessage
          : error.message || fallbackMessage,
  });
}

// --------------------------------------------------
// POST /api/answers/upload
// Faculty uploads a scanned answer-paper PDF.
// multipart fields: file, examId, studentId
// --------------------------------------------------

router.post(
  "/upload",
  requireAuth,
  requireRole("faculty"),
  upload.single("file"),
  async (req, res) => {
    let uploadedPath = null;

    try {
      const { examId, studentId } = req.body;
      const file = req.file;

      if (!file || !examId || !studentId) {
        return res.status(400).json({
          error: "file, examId and studentId are required.",
        });
      }

      // Confirm the exam exists.
      const { data: exam, error: examError } =
        await supabaseAdmin
          .from("exams")
          .select("id")
          .eq("id", examId)
          .maybeSingle();

      if (examError) throw examError;

      if (!exam) {
        return res.status(404).json({
          error: "Exam not found.",
        });
      }

      // Confirm the student profile exists.
      const { data: student, error: studentError } =
        await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", studentId)
          .maybeSingle();

      if (studentError) throw studentError;

      if (!student) {
        return res.status(404).json({
          error: "Student not found.",
        });
      }

      // Use a generated filename rather than trusting the original name.
      const safeFileName =
        `${Date.now()}-${require("crypto").randomUUID()}.pdf`;

      uploadedPath = `answers/${examId}/${studentId}/${safeFileName}`;

      const bucket =
        process.env.SUPABASE_STORAGE_BUCKET || "exam-files";

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from(bucket)
          .upload(uploadedPath, file.buffer, {
            contentType: "application/pdf",
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const { data: submission, error: submissionError } =
        await supabaseAdmin
          .from("answer_submissions")
          .insert({
            exam_id: examId,
            student_id: studentId,
            scanned_file_path: uploadedPath,
            status: "uploaded",
            uploaded_by: req.user.id,
          })
          .select()
          .single();

      if (submissionError) {
        // Avoid leaving an orphaned file if the DB insert fails.
        await supabaseAdmin.storage
          .from(bucket)
          .remove([uploadedPath]);

        throw submissionError;
      }

      return res.status(201).json({
        message: "Answer paper uploaded successfully.",
        submission,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Unable to upload the answer paper."
      );
    }
  }
);

// --------------------------------------------------
// POST /api/answers/:submissionId/process
// Trigger OCR and AI evaluation through Python.
// --------------------------------------------------

router.post(
  "/:submissionId/process",
  requireAuth,
  requireRole("faculty"),
  async (req, res) => {
    const { submissionId } = req.params;

    try {
      // 1. Validate the submission.
      const { data: submission, error: submissionError } =
        await supabaseAdmin
          .from("answer_submissions")
          .select(
            "id, exam_id, student_id, scanned_file_path, status"
          )
          .eq("id", submissionId)
          .maybeSingle();

      if (submissionError) throw submissionError;

      if (!submission) {
        return res.status(404).json({
          error: "Answer submission not found.",
        });
      }

      if (!submission.scanned_file_path) {
        return res.status(400).json({
          error: "No scanned answer-paper file is associated with this submission.",
        });
      }

      // 2. Resolve configuration before changing submission status.
      const serviceUrl = getAIServiceUrl();
      const headers = getAIServiceHeaders();

      // 3. Mark the submission as awaiting OCR/AI processing.
      const { error: updateError } =
        await supabaseAdmin
          .from("answer_submissions")
          .update({ status: "ocr_pending" })
          .eq("id", submissionId);

      if (updateError) throw updateError;

      // 4. Call the Python AI endpoint.
      const response = await axios.post(
        `${serviceUrl}/agents/process-submission`,
        {
          submission_id: submission.id,
          scanned_file_path: submission.scanned_file_path,
          exam_id: submission.exam_id,
        },
        {
          headers,
          timeout: 120000,
        }
      );

      // 5. Return the AI service's response.
      return res.status(200).json({
        message: "Answer-paper processing request completed.",
        submissionId,
        aiResult: response.data,
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Answer-paper processing failed. Check the backend and AI-service logs."
      );
    }
  }
);

// --------------------------------------------------
// Multer and unexpected errors
// --------------------------------------------------

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.status === 400) {
    return sendError(
      res,
      error,
      "Invalid answer-paper upload."
    );
  }

  return next(error);
});

module.exports = router;
