const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth.js");
const messageService = require("../services/message.service.js");
const { supabaseAdmin } = require("../../config/Supabase");
const { notify } = require("../services/notification.service.js");
const { sendEmail } = require("../services/emailService.js");

router.use(requireAuth, requireRole("student", "faculty", "hod", "principal"));

// GET /api/messages
router.get("/", async (req, res) => {
  try {
    const data = await messageService.getMessagesForUser(req.user.id);
    res.json(data || []);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/messages   body: { recipientId, body }
router.post("/", async (req, res) => {
  try {
    const { recipientId, body } = req.body;
    if (!recipientId || !body) return res.status(400).json({ error: "recipientId and body are required" });
    const data = await messageService.sendMessage({ senderId: req.user.id, recipientId, body });

    // Send email notification to recipient
    try {
      const { data: recipientProf } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", recipientId)
        .maybeSingle();

      const { data: senderProf } = await supabaseAdmin
        .from("profiles")
        .select("full_name, role")
        .eq("id", req.user.id)
        .maybeSingle();

      const senderName = senderProf?.full_name || req.user.email || "User";
      const subject = `New Direct Guidance Message from ${senderName}`;
      const emailBody = `Dear ${recipientProf?.full_name || "User"},\n\nYou have received a new message from ${senderName}:\n\n"${body}"\n\nPlease log in to your portal to view the full message thread and reply.\n\nRegards,\nExam AI Platform`;

      await notify(recipientId, "direct_message", subject, body);
      if (recipientProf?.email) {
        await sendEmail(recipientProf.email, subject, emailBody);
      }
    } catch (e) {}

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;