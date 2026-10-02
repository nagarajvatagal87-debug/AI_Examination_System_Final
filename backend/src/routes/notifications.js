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

    if (error) {
      console.warn("Notifications query warning:", error.message);
      return res.json([]);
    }

    res.json(data || []);
  } catch (err) {
    console.error("Notifications fetch error:", err.message);
    res.json([]);
  }
});

// POST /api/notifications/read-all -> mark all as read
router.post("/read-all", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", req.user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read -> mark one as read
router.post("/:id/read", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", req.params.id)
      .eq("recipient_id", req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Notification mark read error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/test -> trigger a real test notification
router.post("/test", async (req, res) => {
  try {
    const testNotes = [
      {
        recipient_id: req.user.id,
        title: "⚡ IAT Internal Marks Updated",
        body: "Faculty published updated evaluation scores for 2nd Sem MCA. Click to review.",
        type: "internal_marks",
        read: false
      },
      {
        recipient_id: req.user.id,
        title: "📢 Department Timetable Approved",
        body: "Main Exam Schedule and Hall Tickets are now available for student download.",
        type: "exam_approved",
        read: false
      },
      {
        recipient_id: req.user.id,
        title: "🤖 AI Evaluation Alert",
        body: "AI paper evaluation for Devops (MMC335) has completed with 98% confidence score.",
        type: "course_material",
        read: false
      }
    ];

    const randomNote = testNotes[Math.floor(Math.random() * testNotes.length)];
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert([randomNote])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Test notification creation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;