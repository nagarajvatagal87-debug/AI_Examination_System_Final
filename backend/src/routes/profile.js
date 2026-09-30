const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.js");
const { supabaseAdmin } = require("../../config/Supabase");
const { getUserAvatar, setUserAvatar } = require("../services/avatarStore");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth);

// GET /api/profile -> current user's full profile
router.get("/", async (req, res) => {
  try {
    const cachedAvatar = getUserAvatar(req.user.id);
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
        avatar_url: cachedAvatar || null,
        avatarUrl: cachedAvatar || null,
      });
    }

    const finalAvatar = data.avatar_url || cachedAvatar || null;
    if (data.avatar_url && !cachedAvatar) {
      setUserAvatar(req.user.id, data.avatar_url);
    }

    res.json({ ...data, avatar_url: finalAvatar, avatarUrl: finalAvatar });
  } catch (err) {
    const cachedAvatar = getUserAvatar(req.user.id);
    res.json({
      id: req.user.id,
      full_name: req.user.fullName || "User",
      email: req.user.email || "",
      role: req.user.role || "principal",
      avatar_url: cachedAvatar || null,
      avatarUrl: cachedAvatar || null,
    });
  }
});

// PUT /api/profile  body: { fullName, avatarUrl, registrationNo, gender, mobile }
router.put("/", async (req, res) => {
  try {
    const { fullName, avatarUrl, registrationNo, registration_no, gender, mobile } = req.body;
    const updatePayload = {};
    if (fullName) updatePayload.full_name = fullName;
    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl;
      if (avatarUrl) {
        setUserAvatar(req.user.id, avatarUrl);
      }
    }
    if (registrationNo || registration_no) updatePayload.registration_no = registrationNo || registration_no;
    if (gender) updatePayload.gender = gender;
    if (mobile) updatePayload.mobile = mobile;

    let data = null;
    try {
      const { data: dbData } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", req.user.id)
        .select()
        .single();
      data = dbData;
    } catch (e) {}

    const cachedAvatar = getUserAvatar(req.user.id);
    const finalAvatar = avatarUrl || cachedAvatar || null;
    res.json(data ? { ...data, avatar_url: finalAvatar, avatarUrl: finalAvatar } : {
      id: req.user.id,
      full_name: fullName || req.user.fullName,
      email: req.user.email,
      avatar_url: finalAvatar,
      avatarUrl: finalAvatar,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/profile/avatar  (multipart: file)
router.post("/avatar", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "file is required" });

    const mimeType = file.mimetype || "image/png";
    const base64Image = `data:${mimeType};base64,${file.buffer.toString("base64")}`;
    let avatarUrl = base64Image;

    // Persist to memory + disk immediately so it never disappears
    setUserAvatar(req.user.id, avatarUrl);

    try {
      await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", req.user.id);
    } catch (e) {}

    res.json({
      id: req.user.id,
      full_name: req.user.fullName || "User",
      email: req.user.email,
      avatar_url: avatarUrl,
      avatarUrl: avatarUrl,
    });
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
      .maybeSingle();

    const deptId = me?.department_id || "dept-mca";

    let hod = null;

    try {
      const { data: department } = await supabaseAdmin
        .from("departments")
        .select("hod_id, profiles!departments_hod_id_fkey(id, full_name, email)")
        .eq("id", deptId)
        .maybeSingle();

      if (department?.profiles) {
        hod = department.profiles;
      }
    } catch (e) {}

    if (!hod) {
      const { data: hodProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("role", "hod")
        .eq("department_id", deptId)
        .maybeSingle();

      if (hodProfile) hod = hodProfile;
    }

    res.json({ hod });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;