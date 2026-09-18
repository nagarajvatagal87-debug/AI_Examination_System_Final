const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/subjects -> list subjects (optionally filtered by department or mine=true)
router.get("/", async (req, res) => {
  const { departmentId, mine } = req.query;
  let query = supabaseAdmin.from("subjects").select("id, name, code, department_id, faculty_id").order("name");
  
  if (mine === "true" && req.user?.id) {
    // If mine=true, try to filter by faculty_id, but fallback to all if no subjects match
    const { data: mySubs } = await supabaseAdmin.from("subjects").select("id, name, code, department_id, faculty_id").eq("faculty_id", req.user.id).order("name");
    if (mySubs && mySubs.length > 0) {
      return res.json(mySubs);
    }
  }

  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/subjects  body: { name, code, departmentId }  -- faculty/hod create subjects
router.post("/", requireRole("faculty", "hod"), async (req, res) => {
  try {
    const { name, code, departmentId } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .insert({ name, code: code || null, department_id: departmentId || null, faculty_id: req.user.id })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;