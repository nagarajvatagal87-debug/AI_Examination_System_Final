const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/course-materials?subjectId=...
router.get("/", async (req, res) => {
  const { subjectId, kind } = req.query;
  let query = supabaseAdmin.from("course_materials").select("*").order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);
  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/course-materials/:id -> single material, with a signed download URL
router.get("/:id", async (req, res) => {
  const { data: material, error } = await supabaseAdmin
    .from("course_materials").select("*").eq("id", req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });

  const { data: signedUrl } = await supabaseAdmin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
    .createSignedUrl(material.file_path, 60 * 10); // valid 10 minutes

  res.json({ ...material, download_url: signedUrl?.signedUrl });
});

module.exports = router;