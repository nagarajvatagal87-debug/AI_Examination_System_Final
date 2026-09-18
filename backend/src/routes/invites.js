const express = require("express");
const crypto = require("crypto");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth, requireRole("principal"));

// POST /api/invites  body: { role: 'faculty'|'hod'|'principal', departmentId? }
router.post("/", async (req, res) => {
  try {
    const { role, departmentId } = req.body;
    if (!["faculty", "hod", "principal"].includes(role)) {
      return res.status(400).json({ error: "role must be faculty, hod, or principal" });
    }

    const code = crypto.randomBytes(6).toString("hex"); // 12-char code

    const { data, error } = await supabaseAdmin
      .from("invites")
      .insert({ code, role, department_id: departmentId || null, created_by: req.user.id })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/invites -> list all invites (to see what's used/unused)
router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("invites")
    .select("*, used_by_profile:profiles!invites_used_by_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;