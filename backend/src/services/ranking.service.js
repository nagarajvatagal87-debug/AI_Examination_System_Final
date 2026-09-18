const { supabaseAdmin } = require("../../config/Supabase");

/**
 * Computes total marks per student for an exam, then writes rank_in_subject
 * and rank_in_department into the rankings table.
 * Only counts evaluations that have final_marks set (teacher-verified) —
 * unverified AI suggestions never count toward a real rank.
 */
async function computeRankings(examId) {
  const { data: exam } = await supabaseAdmin
    .from("exams").select("id, subject_id, subjects(department_id)").eq("id", examId).single();
  if (!exam) throw new Error("Exam not found");

  const { data: submissions } = await supabaseAdmin
    .from("answer_submissions")
    .select(`
      student_id,
      answers ( evaluations ( final_marks ) )
    `)
    .eq("exam_id", examId);

  const totals = (submissions || []).map((sub) => {
    const total = (sub.answers || []).reduce((sum, ans) => {
      const marks = ans.evaluations?.[0]?.final_marks;
      return sum + (marks != null ? Number(marks) : 0);
    }, 0);
    return { student_id: sub.student_id, total_marks: total };
  });

  // Rank within this subject's exam (all these students took the same exam, so
  // rank_in_subject and this exam's ranking are effectively the same ordering)
  const sortedBySubject = [...totals].sort((a, b) => b.total_marks - a.total_marks);

  const rows = sortedBySubject.map((t, i) => ({
    exam_id: examId,
    student_id: t.student_id,
    total_marks: t.total_marks,
    rank_in_subject: i + 1,
    rank_in_department: i + 1, // simplification: assumes one exam = whole department's ranking for this subject
  }));

  // Clear old rankings for this exam before inserting fresh ones (in case of re-publish)
  await supabaseAdmin.from("rankings").delete().eq("exam_id", examId);
  const { error } = await supabaseAdmin.from("rankings").insert(rows);
  if (error) throw error;

  return rows;
}

module.exports = { computeRankings };