const express = require("express");
const multer = require("multer");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth);

// GET /api/profile -> current user's full profile
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, department_id, registration_no, year, section, avatar_url")
      .eq("id", req.user.id)
      .single();

    if (error || !data) {
      return res.json({
        id: req.user.id,
        full_name: req.user.fullName || "User",
        email: req.user.email || "",
        role: req.user.role || "principal",
        avatar_url: null,
      });
    }

    res.json(data);
  } catch (err) {
    res.json({
      id: req.user.id,
      full_name: req.user.fullName || "User",
      email: req.user.email || "",
      role: req.user.role || "principal",
      avatar_url: null,
    });
  }
});

// PUT /api/profile  body: { fullName, avatarUrl, registrationNo, gender, mobile }
router.put("/", async (req, res) => {
  try {
    const { fullName, avatarUrl, registrationNo, registration_no, gender, mobile } = req.body;
    const updatePayload = {};
    if (fullName) updatePayload.full_name = fullName;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
    if (registrationNo || registration_no) updatePayload.registration_no = registrationNo || registration_no;
    if (gender) updatePayload.gender = gender;
    if (mobile) updatePayload.mobile = mobile;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/profile/avatar  (multipart: file)
router.post("/avatar", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "file is required" });

    // Base64 fallback if storage bucket is not created
    const mimeType = file.mimetype || "image/png";
    const base64Image = `data:${mimeType};base64,${file.buffer.toString("base64")}`;

    let avatarUrl = base64Image;

    try {
      const path = `avatars/${req.user.id}-${Date.now()}.${file.originalname.split(".").pop()}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

      if (!uploadError) {
        const { data: signedUrl } = await supabaseAdmin.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET || "exam-files")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedUrl?.signedUrl) {
          avatarUrl = signedUrl.signedUrl;
        }
      }
    } catch (e) {
      console.warn("Storage upload fallback to base64:", e.message);
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/profile/password  body: { newPassword }
router.put("/password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword });
    if (error) throw error;
    res.json({ status: "ok" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/profile/my-hod -> the HOD of the logged-in user's department
router.get("/my-hod", async (req, res) => {
  try {
    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", req.user.id)
      .single();

    if (!me?.department_id) {
      return res.json({ hod: null });
    }

    const { data: department } = await supabaseAdmin
      .from("departments")
      .select("hod_id, profiles!departments_hod_id_fkey(id, full_name, email)")
      .eq("id", me.department_id)
      .single();

    res.json({ hod: department?.profiles || null });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;