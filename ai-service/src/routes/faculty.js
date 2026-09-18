const express = require("express");
const multer = require("multer");
const axios = require("axios");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("faculty", "hod"));

// POST /api/faculty/course-materials  (multipart form: file, subjectId)
router.post("/course-materials", upload.single("file"), async (req, res) => {
  try {
    const { subjectId } = req.body;
    const file = req.file;
    if (!file || !subjectId) {
      return res.status(400).json({ error: "file and subjectId are required" });
    }

    const path = `${subjectId}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    const { data, error } = await supabaseAdmin
      .from("course_materials")
      .insert({
        subject_id: subjectId,
        file_path: path,
        file_name: file.originalname,
        uploaded_by: req.user.id,
        kind: "course_pdf",
      })
      .select()
      .single();
    if (error) throw error;

    // TODO: trigger the Python ai-service to chunk + embed this file for RAG
    // (not built yet — course_chunks stays empty until that endpoint exists)
    // after the `course_materials` insert succeeds, replace the old TODO comment with:
axios.post(
  `${process.env.GENAI_SERVICE_URL}/agents/ingest-course-material`,
  { course_material_id: data.id, subject_id: subjectId, file_path: path },
  { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
).catch((err) => console.error("Ingestion trigger failed:", err.message));

res.status(201).json(data);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/faculty/exams  body: { subjectId, type: 'internal'|'main', title, totalMarks }
router.post("/exams", async (req, res) => {
  try {
    const { subjectId, type, title, totalMarks } = req.body;
    if (!subjectId || !type || !title) {
      return res.status(400).json({ error: "subjectId, type and title are required" });
    }

    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .insert({ subject_id: subjectId, type, title, total_marks: totalMarks || 100, created_by: req.user.id })
      .select()
      .single();
    if (examError) throw examError;

    // Hand off to the Python ai-service (Groq-backed) for question generation
    const { data: generated } = await axios.post(
      `${process.env.GENAI_SERVICE_URL}/agents/question-generation`,
      { exam_id: exam.id, subject_id: subjectId, exam_type: type, total_marks: totalMarks || 100 },
      { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
    );

    res.status(201).json({ exam, generated });
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error || err.message });
  }
});

// GET /api/faculty/evaluation-queue -> low-confidence AI evaluations needing review
router.get("/evaluation-queue", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      id, ai_suggested_marks, ai_confidence, ai_evidence, final_marks,
      answers ( ocr_text, question_id, questions ( question_text, marks ) )
    `)
    .is("final_marks", null)
    .order("ai_confidence", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/faculty/evaluations/:id/verify  body: { finalMarks }
router.post("/evaluations/:id/verify", async (req, res) => {
  const { finalMarks } = req.body;
  const { id } = req.params;

  const { data: before } = await supabaseAdmin.from("evaluations").select("*").eq("id", id).single();

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .update({ final_marks: finalMarks, verified_by: req.user.id, verified_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: req.user.id,
    action: "EVALUATION_VERIFIED",
    entity_type: "evaluations",
    entity_id: id,
    before_value: before,
    after_value: data,
  });

  res.json(data);
});

module.exports = router;