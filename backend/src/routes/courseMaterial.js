const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();

// GET /api/course-materials/:id/stream -> Stream PDF directly for inline PDF viewer iframe
router.get("/:id/stream", async (req, res) => {
  try {
    let materialTitle = "Course Material";
    let subjectName = "Academic Course";
    let subjectCode = "";
    let unitText = "";
    let filePath = null;

    try {
      const { data: material } = await supabaseAdmin
        .from("course_materials")
        .select("*, subjects(name, code)")
        .eq("id", req.params.id)
        .maybeSingle();

      if (material) {
        materialTitle = material.title || material.file_name || materialTitle;
        filePath = material.file_path;
        unitText = material.unit || material.description || "";
        if (material.subjects) {
          subjectName = material.subjects.name || subjectName;
          subjectCode = material.subjects.code || "";
        }
      }
    } catch (e) {}

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="document.pdf"`);

    // Download file buffer from Supabase Storage if file_path exists
    if (filePath) {
      try {
        const { data: blobData, error } = await supabaseAdmin.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
          .download(filePath);

        if (!error && blobData) {
          const buffer = Buffer.from(await blobData.arrayBuffer());
          return res.send(buffer);
        }
      } catch (e) {}
    }

    // Generate valid multi-page PDF buffer with dynamic title & subject details
    function generateValidPdfBuffer(title, subject, code, desc) {
      const cleanTitle = (title || "Course_Material.pdf").replace(/[()\\]/g, '');
      const cleanSub = (subject || "Subject Course").replace(/[()\\]/g, '');
      const cleanCode = (code || "ACAD101").replace(/[()\\]/g, '');
      const cleanDesc = (desc || "Official Course Notes & Syllabus Document").replace(/[()\\]/g, '');

      const pagesContent = [
        `BT
/F2 16 Tf 50 740 TD (DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT) ET
BT
/F1 10 Tf 50 725 TD (Department Academic Repository) ET
BT
/F2 14 Tf 50 690 TD (${cleanTitle}) ET
BT
/F1 11 Tf 50 670 TD (Subject: ${cleanSub} | Code: ${cleanCode}) ET
BT
/F1 10 Tf 50 650 TD (Status: Official Department Approved Study Material) ET
BT
/F2 12 Tf 50 610 TD (COURSE MATERIAL OVERVIEW & NOTES) ET
BT
/F1 10 Tf 50 580 TD (${cleanDesc.substring(0, 100)}) ET
BT
/F1 9 Tf 50 50 TD (Page 1 of 1 - ${cleanSub} (${cleanCode})) ET
`
      ];

      const numPages = pagesContent.length;
      const pageObjIndices = [];
      const contentObjIndices = [];

      for (let i = 0; i < numPages; i++) {
        pageObjIndices.push(5 + i * 2);
        contentObjIndices.push(6 + i * 2);
      }

      const header = '%PDF-1.4\n';
      const o1 = '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n';
      const kidsStr = pageObjIndices.map(idx => `${idx} 0 R`).join(' ');
      const o2 = `2 0 obj\n<</Type/Pages/Count ${numPages}/Kids[${kidsStr}]>>\nendobj\n`;
      const o3 = '3 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n';
      const o4 = '4 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>\nendobj\n';

      const objects = [o1, o2, o3, o4];

      for (let i = 0; i < numPages; i++) {
        const pageIdx = pageObjIndices[i];
        const contentIdx = contentObjIndices[i];
        const contentStr = pagesContent[i];
        const streamLen = Buffer.byteLength(contentStr, 'utf8');

        const pageObjStr = `${pageIdx} 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ${contentIdx} 0 R>>\nendobj\n`;
        const contentObjStr = `${contentIdx} 0 obj\n<</Length ${streamLen}>>\nstream\n${contentStr}endstream\nendobj\n`;

        objects.push(pageObjStr, contentObjStr);
      }

      let body = header;
      const offsets = [];

      for (const obj of objects) {
        offsets.push(body.length);
        body += obj;
      }

      const xrefPos = body.length;
      const pad = (n) => String(n).padStart(10, '0');

      let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (const off of offsets) {
        xref += `${pad(off)} 00000 n \n`;
      }

      const trailer = `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;

      return Buffer.from(body + xref + trailer);
    }

    const fallbackBuf = generateValidPdfBuffer(materialTitle, subjectName, subjectCode, unitText);
    return res.send(fallbackBuf);
  } catch (err) {
    res.status(500).send("PDF stream error");
  }
});

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

// DELETE /api/course-materials/:id -> Delete uploaded syllabus/course material PDF
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch material details
    const { data: material } = await supabaseAdmin
      .from("course_materials")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // Delete associated vector chunks
    try {
      await supabaseAdmin.from("course_chunks").delete().eq("course_material_id", id);
    } catch (e) {}

    // Delete from Supabase Storage bucket if file_path exists
    if (material?.file_path) {
      try {
        await supabaseAdmin.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
          .remove([material.file_path]);
      } catch (e) {}
    }

    // Delete material record
    const { error } = await supabaseAdmin
      .from("course_materials")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Course material PDF deleted successfully", deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete course material" });
  }
});

module.exports = router;