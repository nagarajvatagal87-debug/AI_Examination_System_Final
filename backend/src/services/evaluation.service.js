
const { supabaseAdmin } = require("../../config/Supabase");

async function getSubmissionEvaluations(submissionId) {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      id,
      answer_id,
      ai_suggested_marks,
      ai_confidence,
      ai_evidence,
      ai_explanation,
      final_marks,
      published,
      answers!inner (
        id,
        submission_id,
        ocr_text,
        ocr_confidence,
        question_id,
        questions (
          id,
          question_text,
          marks,
          question_number,
          question_no,
          exam_id
        )
      )
    `)
    .eq("answers.submission_id", submissionId);

  if (error) throw error;

  return (data || []).sort((a, b) => {
    const qa = a.answers?.questions;
    const qb = b.answers?.questions;

    const questionA = Array.isArray(qa) ? qa[0] : qa;
    const questionB = Array.isArray(qb) ? qb[0] : qb;

    const numberA = questionA?.question_number ??
      questionA?.question_no ?? 0;
    const numberB = questionB?.question_number ??
      questionB?.question_no ?? 0;

    return numberA - numberB;
  });
}

async function verifyEvaluation({
  evaluationId,
  finalMarks,
  actorId,
}) {
  if (
    typeof finalMarks !== "number" ||
    !Number.isFinite(finalMarks) ||
    finalMarks < 0
  ) {
    const error = new Error("Final marks must be a valid non-negative number.");
    error.status = 400;
    throw error;
  }

  const { data: before, error: beforeError } = await supabaseAdmin
    .from("evaluations")
    .select(`
      *,
      answers!inner (
        id,
        questions (marks)
      )
    `)
    .eq("id", evaluationId)
    .single();

  if (beforeError) throw beforeError;

  const answer = before.answers;
  const question = Array.isArray(answer?.questions)
    ? answer.questions[0]
    : answer?.questions;

  if (!question || typeof question.marks !== "number") {
    const error = new Error("Could not determine the question's maximum marks.");
    error.status = 400;
    throw error;
  }

  if (finalMarks > question.marks) {
    const error = new Error(
      `Final marks cannot exceed ${question.marks}.`
    );
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .update({
      final_marks: finalMarks,
      verified_by: actorId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", evaluationId)
    .select()
    .single();

  if (error) throw error;

  const { error: auditError } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      actor_id: actorId,
      action: "EVALUATION_VERIFIED",
      entity_type: "evaluations",
      entity_id: evaluationId,
      before_value: before,
      after_value: data,
    });

  if (auditError) {
    console.error("Audit log insertion failed:", auditError.message);
  }

  return data;
}

async function publishSubmission({ submissionId, actorId }) {
  const { data: submission, error: submissionError } =
    await supabaseAdmin
      .from("answer_submissions")
      .select(`
        id,
        student_id,
        exam_id,
        total_marks,
        max_marks,
        exams (
          title,
          total_marks,
          subject_id,
          subjects (name, code)
        )
      `)
      .eq("id", submissionId)
      .single();

  if (submissionError) throw submissionError;

  const { data: evaluations, error: evaluationError } =
    await supabaseAdmin
      .from("evaluations")
      .select(`
        id,
        final_marks,
        published,
        answers!inner (
          submission_id,
          question_id,
          questions (marks, exam_id)
        )
      `)
      .eq("answers.submission_id", submissionId);

  if (evaluationError) throw evaluationError;

  if (!evaluations || evaluations.length === 0) {
    const error = new Error("No evaluations exist for this submission.");
    error.status = 400;
    throw error;
  }

  const unverified = evaluations.filter(
    (evaluation) => evaluation.final_marks === null
  );

  if (unverified.length > 0) {
    const error = new Error(
      `${unverified.length} question(s) still need faculty verification.`
    );
    error.status = 400;
    throw error;
  }

  const examEvaluations = evaluations.filter((evaluation) => {
    const answer = evaluation.answers;
    const question = Array.isArray(answer?.questions)
      ? answer.questions[0]
      : answer?.questions;

    return String(question?.exam_id) === String(submission.exam_id);
  });

  if (examEvaluations.length !== evaluations.length) {
    const error = new Error(
      "The submission contains evaluations linked to another exam."
    );
    error.status = 400;
    throw error;
  }

  const totalMarks = examEvaluations.reduce(
    (sum, evaluation) => sum + Number(evaluation.final_marks),
    0
  );

  const maxMarks = examEvaluations.reduce((sum, evaluation) => {
    const answer = evaluation.answers;
    const question = Array.isArray(answer?.questions)
      ? answer.questions[0]
      : answer?.questions;

    return sum + Number(question?.marks || 0);
  }, 0);

  const now = new Date().toISOString();

  const { error: publishError } = await supabaseAdmin
    .from("evaluations")
    .update({
      published: true,
      published_at: now,
    })
    .in("id", examEvaluations.map((evaluation) => evaluation.id));

  if (publishError) throw publishError;

  // Persist the faculty-verified total for the submission.
  const { error: totalError } = await supabaseAdmin
    .from("answer_submissions")
    .update({
      total_marks: totalMarks,
      max_marks: maxMarks,
    })
    .eq("id", submissionId);

  if (totalError) throw totalError;

  const { data: student, error: studentError } =
    await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", submission.student_id)
      .single();

  if (studentError) throw studentError;

  const exam = Array.isArray(submission.exams)
    ? submission.exams[0]
    : submission.exams;

  const subject = Array.isArray(exam?.subjects)
    ? exam.subjects[0]
    : exam?.subjects;

  const subjectName = subject?.name
    ? `${subject.name}${subject.code ? ` (${subject.code})` : ""}`
    : "Course Subject";

  const { error: notificationError } = await supabaseAdmin
    .from("notifications")
    .insert({
      recipient_id: submission.student_id,
      type: "marks_published",
      title: `Marks Published: ${subjectName}`,
      body: `Your ${subjectName} — ${exam?.title || "Exam"} marks have been published.`,
    });

  if (notificationError) {
    console.error(
      "Student notification failed:",
      notificationError.message
    );
  }

  try {
    if (student?.email) {
      const { sendInternalResultEmail } = require("./emailService");

      await sendInternalResultEmail(
        student.email,
        student.full_name,
        exam?.title || "Exam",
        totalMarks,
        maxMarks || exam?.total_marks || 50,
        subjectName
      );
    }
  } catch (emailError) {
    console.error("Result email failed:", emailError.message);
  }

  const { error: auditError } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      actor_id: actorId,
      action: "STUDENT_RESULT_PUBLISHED",
      entity_type: "answer_submissions",
      entity_id: submissionId,
    });

  if (auditError) {
    console.error("Publication audit log failed:", auditError.message);
  }

  return {
    published: examEvaluations.length,
    totalMarks,
    maxMarks,
  };
}

async function getExamAnalytics(examId) {
  const { data: exam, error: examError } = await supabaseAdmin
    .from("exams")
    .select("id, total_marks")
    .eq("id", examId)
    .single();

  if (examError) throw examError;

  const { data: evaluations, error } = await supabaseAdmin
    .from("evaluations")
    .select(`
      final_marks,
      published,
      answers!inner (
        submission_id,
        questions!inner (exam_id)
      )
    `)
    .eq("answers.questions.exam_id", examId)
    .eq("published", true)
    .not("final_marks", "is", null);

  if (error) throw error;

  const bySubmission = {};

  for (const evaluation of evaluations || []) {
    const submissionId = evaluation.answers?.submission_id;
    if (!submissionId) continue;

    bySubmission[submissionId] =
      (bySubmission[submissionId] || 0) +
      Number(evaluation.final_marks);
  }

  const totals = Object.values(bySubmission);

  const average = totals.length
    ? totals.reduce((sum, value) => sum + value, 0) / totals.length
    : 0;

  const highest = totals.length ? Math.max(...totals) : 0;
  const lowest = totals.length ? Math.min(...totals) : 0;

  const buckets = {
    "0-20%": 0,
    "21-40%": 0,
    "41-60%": 0,
    "61-80%": 0,
    "81-100%": 0,
  };

  for (const total of totals) {
    const percentage = exam.total_marks > 0
      ? (total / exam.total_marks) * 100
      : 0;

    if (percentage <= 20) buckets["0-20%"]++;
    else if (percentage <= 40) buckets["21-40%"]++;
    else if (percentage <= 60) buckets["41-60%"]++;
    else if (percentage <= 80) buckets["61-80%"]++;
    else buckets["81-100%"]++;
  }

  return {
    evaluatedCount: totals.length,
    average: Math.round(average * 10) / 10,
    highest,
    lowest,
    distribution: buckets,
  };
}

module.exports = {
  getSubmissionEvaluations,
  verifyEvaluation,
  publishSubmission,
  getExamAnalytics,
};
