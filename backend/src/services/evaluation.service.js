const { supabaseAdmin } = require("../../config/Supabase");
const { sendEmail } = require("./notification.service.js");

async function getSubmissionEvaluations(submissionId) {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      id, ai_suggested_marks, ai_confidence, ai_evidence, ai_explanation,
      final_marks, published,
      answers (
        id, ocr_text, ocr_confidence,
        questions ( id, question_text, marks, question_number )
      )
    `)
    .eq("answers.answer_submission_id", submissionId)
    .order("answers(questions(question_number))", { ascending: true });
  if (error) throw error;
  return data;
}

async function verifyEvaluation({ evaluationId, finalMarks, actorId }) {
  const { data: before } = await supabaseAdmin.from("evaluations").select("*").eq("id", evaluationId).single();

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .update({ final_marks: finalMarks, verified_by: actorId, verified_at: new Date().toISOString() })
    .eq("id", evaluationId)
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action: "EVALUATION_VERIFIED",
    entity_type: "evaluations",
    entity_id: evaluationId,
    before_value: before,
    after_value: data,
  });

  return data;
}

async function publishSubmission({ submissionId, actorId }) {
  const { data: evaluations, error } = await supabaseAdmin
    .from("evaluations")
    .select("id, final_marks, answers(answer_submission_id)")
    .eq("answers.answer_submission_id", submissionId);
  if (error) throw error;

  const unverified = evaluations.filter((e) => e.final_marks === null);
  if (unverified.length > 0) {
    const err = new Error(`${unverified.length} question(s) still need faculty verification before publishing.`);
    err.status = 400;
    throw err;
  }

  await supabaseAdmin
    .from("evaluations")
    .update({ published: true, published_at: new Date().toISOString() })
    .in("id", evaluations.map((e) => e.id));

  const { data: submission } = await supabaseAdmin
    .from("answer_submissions")
    .select("student_id, exam_id, exams(title)")
    .eq("id", submissionId)
    .single();

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", submission.student_id)
    .single();

  await supabaseAdmin.from("notifications").insert({
    recipient_id: submission.student_id,
    type: "marks_published",
    title: "Marks Published",
    body: `Your ${submission.exams.title} marks have been published.`,
  });

  sendEmail(
    student.email,
    "Marks Published",
    `Hi ${student.full_name}, your ${submission.exams.title} marks have been published. Log in to view your results.`
  ).catch((e) => console.error("Email send failed:", e.message));

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action: "STUDENT_RESULT_PUBLISHED",
    entity_type: "answer_submissions",
    entity_id: submissionId,
  });

  return { published: evaluations.length };
}

async function getExamAnalytics(examId) {
  const { data: evaluations, error } = await supabaseAdmin
    .from("evaluations")
    .select(`final_marks, answers ( answer_submission_id )`)
    .not("final_marks", "is", null);
  if (error) throw error;

  const bySubmission = {};
  for (const e of evaluations) {
    const subId = e.answers?.answer_submission_id;
    if (!subId) continue;
    bySubmission[subId] = (bySubmission[subId] || 0) + e.final_marks;
  }
  const totals = Object.values(bySubmission);

  const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const highest = totals.length ? Math.max(...totals) : 0;
  const lowest = totals.length ? Math.min(...totals) : 0;

  const { data: exam } = await supabaseAdmin.from("exams").select("total_marks").eq("id", examId).single();
  const buckets = { "0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0 };
  for (const t of totals) {
    const pct = (t / exam.total_marks) * 100;
    if (pct <= 20) buckets["0-20%"]++;
    else if (pct <= 40) buckets["21-40%"]++;
    else if (pct <= 60) buckets["41-60%"]++;
    else if (pct <= 80) buckets["61-80%"]++;
    else buckets["81-100%"]++;
  }

  return { evaluatedCount: totals.length, average: Math.round(average * 10) / 10, highest, lowest, distribution: buckets };
}

module.exports = { getSubmissionEvaluations, verifyEvaluation, publishSubmission, getExamAnalytics };