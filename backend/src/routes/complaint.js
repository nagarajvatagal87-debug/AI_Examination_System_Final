const express = require("express");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth, requireRole } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// GET /api/complaints -> faculty/hod view: pending complaints for review
router.get("/", requireRole("faculty", "hod"), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("complaints")
    .select(`
      id, reason, status, extra_marks_awarded, created_at,
      profiles ( full_name, registration_no ),
      evaluations ( id, final_marks, ai_suggested_marks, answers ( question_id, questions ( question_text, exam_id, exams ( type ) ) ) )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/complaints/:id/resolve  body: { approved, extraMarks, resolutionNote }
router.post("/:id/resolve", requireRole("faculty", "hod"), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, extraMarks, resolutionNote } = req.body;

    // Enforce: complaints only exist for Internal exams in the first place, but
    // double-check here too, since this is where marks actually get changed.
    const { data: complaint, error: fetchError } = await supabaseAdmin
      .from("complaints")
      .select("id, evaluation_id, evaluations(id, answers(question_id, questions(exam_id, exams(type))))")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const examType = complaint.evaluations?.answers?.questions?.exams?.type;
    if (examType !== "internal") {
      return res.status(403).json({ error: "Complaints can only be resolved for Internal exams" });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("complaints")
      .update({
        status: approved ? "resolved" : "rejected",
        resolved_by: req.user.id,
        resolution_note: resolutionNote || null,
        extra_marks_awarded: approved ? extraMarks || 0 : null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    if (approved && extraMarks) {
      const { data: beforeEval } = await supabaseAdmin
        .from("evaluations").select("*").eq("id", complaint.evaluation_id).single();

      const newFinalMarks = (beforeEval.final_marks || 0) + Number(extraMarks);

      const { data: afterEval } = await supabaseAdmin
        .from("evaluations")
        .update({ final_marks: newFinalMarks })
        .eq("id", complaint.evaluation_id)
        .select()
        .single();

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: req.user.id,
        action: "COMPLAINT_EXTRA_MARKS_AWARDED",
        entity_type: "evaluations",
        entity_id: complaint.evaluation_id,
        before_value: beforeEval,
        after_value: afterEval,
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;