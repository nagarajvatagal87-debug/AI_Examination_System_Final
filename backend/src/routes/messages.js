const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth.js");
const messageService = require("../services/message.service.js");

router.use(requireAuth, requireRole("faculty", "hod"));

// GET /api/messages
router.get("/", async (req, res) => {
  try {
    const data = await messageService.getMessagesForUser(req.user.id);
    res.json(data);
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
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;