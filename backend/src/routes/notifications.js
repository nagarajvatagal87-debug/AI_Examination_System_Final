const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications -> the logged-in user's own notifications
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("recipient_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error("Notifications fetch error:", err.message);
    res.json([]);
  }
});

// POST /api/notifications/:id/read -> mark one as read
router.post("/:id/read", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", req.params.id)
      .eq("recipient_id", req.user.id) // can't mark someone else's notification read
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Notification mark read error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;