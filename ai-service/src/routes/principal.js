const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();

router.use(requireAuth, requireRole("principal"));

// GET /api/principal/overview -> all departments + each department's #1 rankers
router.get("/overview", async (req, res) => {
  try {
    const { data: departments, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("id, name, hod_id");
    if (deptError) throw deptError;

    const { data: toppers, error: topperError } = await supabaseAdmin
      .from("rankings")
      .select("total_marks, rank_in_department, exam_id, student_id, profiles(full_name, registration_no, department_id)")
      .eq("rank_in_department", 1);
    if (topperError) throw topperError;

    res.json({ departments, department_toppers: toppers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;