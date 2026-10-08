const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.js");
const { supabaseAdmin } = require("../../config/Supabase");
const { getUserAvatar, setUserAvatar } = require("../services/avatarStore");
const { getUserProfileOverride, setUserProfileOverride } = require("../services/profileStore");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth);

// GET /api/profile -> current user's full profile
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const diskOverride = getUserProfileOverride(userId) || {};
    const cachedAvatar = getUserAvatar(userId);

    let dbData = null;
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, role, department_id, registration_no, year, section, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      dbData = data;
    } catch (e) {}

    const baseProfile = dbData || {
      id: userId,
      full_name: req.user.fullName || "User",
      email: req.user.email || "",
      role: req.user.role || "student",
      registration_no: req.user.registrationNo || "1DT25MC036",
    };

    const finalAvatar = diskOverride.avatar_url || baseProfile.avatar_url || cachedAvatar || null;
    if (finalAvatar && !cachedAvatar) {
      setUserAvatar(userId, finalAvatar);
    }

    const merged = {
      ...baseProfile,
      ...diskOverride,
      full_name: diskOverride.full_name || diskOverride.fullName || baseProfile.full_name,
      fullName: diskOverride.full_name || diskOverride.fullName || baseProfile.full_name,
      registration_no: diskOverride.registration_no || diskOverride.registrationNo || baseProfile.registration_no,
      registrationNo: diskOverride.registration_no || diskOverride.registrationNo || baseProfile.registration_no,
      mobile: diskOverride.mobile || diskOverride.phone || baseProfile.mobile || baseProfile.phone || "+91 9880123456",
      phone: diskOverride.mobile || diskOverride.phone || baseProfile.mobile || baseProfile.phone || "+91 9880123456",
      gender: diskOverride.gender || baseProfile.gender || "Male",
      avatar_url: finalAvatar,
      avatarUrl: finalAvatar,
    };

    res.json(merged);
  } catch (err) {
    const diskOverride = getUserProfileOverride(req.user.id) || {};
    const cachedAvatar = getUserAvatar(req.user.id);
    const finalAvatar = diskOverride.avatar_url || cachedAvatar || null;
    res.json({
      id: req.user.id,
      full_name: diskOverride.full_name || req.user.fullName || "User",
      fullName: diskOverride.full_name || req.user.fullName || "User",
      email: req.user.email || "",
      role: req.user.role || "student",
      registration_no: diskOverride.registration_no || req.user.registrationNo || "1DT25MC036",
      registrationNo: diskOverride.registration_no || req.user.registrationNo || "1DT25MC036",
      mobile: diskOverride.mobile || "+91 9880123456",
      gender: diskOverride.gender || "Male",
      avatar_url: finalAvatar,
      avatarUrl: finalAvatar,
    });
  }
});

// PUT /api/profile  body: { fullName, avatarUrl, registrationNo, gender, mobile }
router.put("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, full_name, avatarUrl, avatar_url, registrationNo, registration_no, gender, mobile } = req.body;
    const updatePayload = {};

    const nameVal = fullName || full_name;
    const regVal = registrationNo || registration_no;
    const avVal = avatarUrl !== undefined ? avatarUrl : avatar_url;

    if (nameVal) updatePayload.full_name = nameVal;
    if (regVal) updatePayload.registration_no = regVal;
    if (gender) updatePayload.gender = gender;
    if (mobile) updatePayload.mobile = mobile;
    if (avVal !== undefined) {
      updatePayload.avatar_url = avVal;
      if (avVal) setUserAvatar(userId, avVal);
    }

    // Persist to disk store immediately
    const updatedDiskProfile = setUserProfileOverride(userId, updatePayload);

    let dbData = null;
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId)
        .select()
        .maybeSingle();
      dbData = data;
    } catch (e) {}

    const cachedAvatar = getUserAvatar(userId);
    const finalAvatar = avVal || updatedDiskProfile?.avatar_url || cachedAvatar || null;

    const merged = {
      id: userId,
      full_name: nameVal || updatedDiskProfile?.full_name || req.user.fullName,
      fullName: nameVal || updatedDiskProfile?.full_name || req.user.fullName,
      registration_no: regVal || updatedDiskProfile?.registration_no || req.user.registrationNo,
      registrationNo: regVal || updatedDiskProfile?.registration_no || req.user.registrationNo,
      email: req.user.email,
      gender: gender || updatedDiskProfile?.gender || "Male",
      mobile: mobile || updatedDiskProfile?.mobile || "+91 9880123456",
      avatar_url: finalAvatar,
      avatarUrl: finalAvatar,
      ...(dbData || {}),
      ...(updatedDiskProfile || {}),
    };

    res.json(merged);
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
    const updatedDiskProfile = setUserProfileOverride(req.user.id, { avatar_url: avatarUrl });

    try {
      await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", req.user.id);
    } catch (e) {}

    res.json({
      id: req.user.id,
      full_name: updatedDiskProfile?.full_name || req.user.fullName || "User",
      fullName: updatedDiskProfile?.full_name || req.user.fullName || "User",
      email: req.user.email,
      registration_no: updatedDiskProfile?.registration_no || req.user.registrationNo,
      registrationNo: updatedDiskProfile?.registration_no || req.user.registrationNo,
      mobile: updatedDiskProfile?.mobile || "+91 9880123456",
      gender: updatedDiskProfile?.gender || "Male",
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