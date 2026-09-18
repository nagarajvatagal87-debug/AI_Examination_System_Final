const { computeRankings } = require("../services/ranking.service.js");
const { notifyResultsPublished } = require("../services/notification.service.js");

// POST /api/faculty/exams/:examId/publish-results
router.post("/exams/:examId/publish-results", async (req, res) => {
  try {
    const { examId } = req.params;

    // Guard: don't publish if any evaluation is still unverified
    const { data: unverified } = await supabaseAdmin
      .from("evaluations")
      .select("id, answers!inner(question_id, questions!inner(exam_id))")
      .eq("answers.questions.exam_id", examId)
      .is("final_marks", null);

    if (unverified && unverified.length > 0) {
      return res.status(400).json({
        error: `${unverified.length} answer(s) still need teacher verification before publishing.`,
      });
    }

    const rankings = await computeRankings(examId);
    await notifyResultsPublished(examId);

    res.json({ status: "published", rankings_created: rankings.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});