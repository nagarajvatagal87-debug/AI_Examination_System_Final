const express = require("express");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// POST /api/chat  body: { subjectId, question, history? }
router.post("/", async (req, res) => {
  try {
    const { subjectId, question, history } = req.body;
    if (!subjectId || !question) {
      return res.status(400).json({ error: "subjectId and question are required" });
    }

    const { data } = await axios.post(
      `${process.env.GENAI_SERVICE_URL}/agents/chat`,
      { subject_id: subjectId, question, history: history || [] },
      { headers: { Authorization: `Bearer ${process.env.GENAI_SERVICE_API_KEY}` } }
    );

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.detail || err.message });
  }
});

module.exports = router;