const { supabaseAdmin } = require("../../config/Supabase");
const { sendEmail, notify } = require("./notification.service");
const { getStudentInternalMarks, saveInternalMarks } = require("./internalMarksStore");

// Primary In-Memory Complaint Store
const memoryComplaints = [];

/**
 * Fetch complaints for logged-in student
 */
async function getStudentComplaints(studentId) {
  let dbData = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (!error && data) dbData = data;
  } catch (err) {}

  const memData = memoryComplaints.filter((c) => c.student_id === studentId);
  const map = new Map();
  dbData.forEach((c) => map.set(c.id, c));
  memData.forEach((c) => map.set(c.id, c));

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Fetch all complaints for Faculty / HOD view
 */
async function getAllComplaints() {
  let dbData = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("complaints")
      .select(`
        id, reason, status, extra_marks_awarded, resolution_note, created_at, student_id,
        profiles ( full_name, registration_no ),
        evaluations ( id, final_marks, ai_suggested_marks, answers ( question_id, questions ( question_no, question_text, marks, exam_id, exams ( type, title ) ) ) )
      `)
      .order("created_at", { ascending: false });
    if (!error && data) dbData = data;
  } catch (err) {}

  const map = new Map();
  dbData.forEach((c) => map.set(c.id, c));
  memoryComplaints.forEach((c) => map.set(c.id, c));

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Create a new complaint from student & send Faculty Email Notification
 */
async function createComplaint(studentId, payload) {
  let studentProfile = null;
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, email")
      .eq("id", studentId)
      .maybeSingle();
    if (data) studentProfile = data;
  } catch (e) {}

  const studentName = studentProfile?.full_name || payload.studentName || "Student User";
  const studentReg = studentProfile?.registration_no || payload.studentReg || "1DS23MCA001";
  const studentEmail = studentProfile?.email || "student@dsatm.edu.in";
  const facultyEmail = process.env.FACULTY_EMAIL || "faculty@dsatm.edu.in";

  const questionTitle = payload.questionTitle || payload.question || "Internal Examination Assessment";
  const subjectName = payload.subjectName || "Computer Applications";
  const subjectCode = payload.subjectCode || "MMC321";
  const currentMarks = Number(payload.currentMarks || payload.teacherScore || 6);
  const maxMarks = Number(payload.maxMarks || 10);
  const aiScore = Number(payload.aiScore || currentMarks);

  const complaintId = `cmp-${Date.now()}`;

  const newComplaint = {
    id: complaintId,
    student_id: studentId,
    student_name: studentName,
    registration_no: studentReg,
    student_email: studentEmail,
    evaluation_id: payload.evaluationId || `eval-${complaintId}`,
    question_title: questionTitle,
    subject_id: payload.subjectId || "sub-dl",
    subject_name: subjectName,
    subject_code: subjectCode,
    current_marks: currentMarks,
    max_marks: maxMarks,
    ai_suggested_marks: aiScore,
    reason: payload.reason,
    status: "open",
    extra_marks_awarded: null,
    resolution_note: null,
    created_at: new Date().toISOString(),
    profiles: {
      full_name: studentName,
      registration_no: studentReg,
    },
    evaluations: {
      id: payload.evaluationId || `eval-${complaintId}`,
      final_marks: currentMarks,
      ai_suggested_marks: aiScore,
      answers: {
        question_id: `q-${complaintId}`,
        questions: {
          question_no: payload.questionNo || 1,
          question_text: questionTitle,
          marks: maxMarks,
          exams: {
            type: "internal",
            title: payload.examTitle || "Internal Assessment 1"
          }
        }
      }
    }
  };

  memoryComplaints.unshift(newComplaint);

  // Try saving to Supabase if DB schema allows
  try {
    await supabaseAdmin.from("complaints").insert({
      id: complaintId,
      student_id: studentId,
      evaluation_id: payload.evaluationId && payload.evaluationId.includes("-") ? payload.evaluationId : null,
      reason: payload.reason,
      status: "open",
    });
  } catch (e) {
    // DB schema fallback handled by memory store
  }

  // 📧 Send Structured DSATM HTML Email to Faculty
  const emailSubject = `💬 Student Complaint Filed: ${studentName} (${studentReg}) - ${subjectCode}`;
  const emailBody = `
Dear Subject Faculty,

A new internal mark re-evaluation complaint has been submitted by student ${studentName} (${studentReg}).

📌 Complaint Details:
• Student Name: ${studentName}
• USN / Reg No: ${studentReg}
• Course / Subject: ${subjectName} (${subjectCode})
• Evaluation Item: ${questionTitle}
• Current Score: ${currentMarks} / ${maxMarks} Marks (AI Suggested: ${aiScore})
• Student Appeal Reason: "${payload.reason}"

Please log in to your DSATM Faculty Portal under the "Complaints" tab to review the appeal, verify the answer script, and award extra marks or provide resolution feedback.
  `;

  try {
    await sendEmail(facultyEmail, emailSubject, emailBody.trim());
    console.log(`[Email Sent] Complaint notification delivered to Faculty (${facultyEmail}) for student ${studentName}`);
  } catch (err) {
    console.error("Failed to send complaint email to faculty:", err.message);
  }

  // Send In-App Notification to Faculty if ID known
  const { data: facultyUser } = await supabaseAdmin.from("profiles").select("id").eq("role", "faculty").limit(1).maybeSingle();
  if (facultyUser?.id) {
    await notify(facultyUser.id, "marks_published", `💬 Student Mark Complaint: ${studentReg}`, `${studentName} raised a complaint for ${subjectCode}: "${payload.reason.substring(0, 50)}..."`);
  }

  return newComplaint;
}

/**
 * Resolve a complaint by Faculty or HOD & send Student Email Notification
 */
async function resolveComplaint(complaintId, facultyUser, { approved, extraMarks, resolutionNote }) {
  let complaint = memoryComplaints.find((c) => c.id === complaintId);

  // If not found in memory, try DB fetch
  if (!complaint) {
    try {
      const { data } = await supabaseAdmin
        .from("complaints")
        .select(`
          *, profiles ( full_name, registration_no, email ),
          evaluations ( id, final_marks, ai_suggested_marks, answers ( question_id, questions ( question_no, question_text, marks, exam_id, exams ( type, title ) ) ) )
        `)
        .eq("id", complaintId)
        .single();
      if (data) complaint = data;
    } catch (e) {}
  }

  if (!complaint) {
    throw new Error("Complaint record not found");
  }

  const numericExtra = approved ? Number(extraMarks || 0) : 0;
  const newStatus = approved ? "resolved" : "rejected";

  complaint.status = newStatus;
  complaint.extra_marks_awarded = numericExtra;
  complaint.resolution_note = resolutionNote || (approved ? "Approved upon faculty review." : "Reviewed. Marks stand as evaluated.");
  complaint.resolved_at = new Date().toISOString();
  complaint.resolved_by = facultyUser?.id || "faculty-1";

  // If approved and extra marks given, update evaluation score in memory
  if (approved && numericExtra > 0) {
    if (complaint.evaluations) {
      complaint.evaluations.final_marks = (complaint.evaluations.final_marks || complaint.current_marks || 0) + numericExtra;
    }
    complaint.current_marks = (complaint.current_marks || 0) + numericExtra;
  }

  // Update Supabase DB if record exists
  try {
    await supabaseAdmin
      .from("complaints")
      .update({
        status: newStatus,
        resolved_by: facultyUser?.id,
        resolution_note: complaint.resolution_note,
        extra_marks_awarded: numericExtra,
        resolved_at: complaint.resolved_at,
      })
      .eq("id", complaintId);
  } catch (e) {}

  // 📧 Send Resolution Email to Student
  const studentEmail = complaint.student_email || "student@dsatm.edu.in";
  const studentName = complaint.student_name || complaint.profiles?.full_name || "Student";
  const subjectLabel = complaint.subject_name ? `${complaint.subject_name} (${complaint.subject_code || ''})` : complaint.question_title;

  const emailSubject = `💬 Update on Internal Mark Complaint: ${subjectLabel} - ${newStatus.toUpperCase()}`;
  const emailBody = `
Dear ${studentName},

Your internal mark re-evaluation complaint for "${subjectLabel}" has been reviewed by your Subject Faculty.

📌 Complaint Resolution Summary:
• Status: ${newStatus.toUpperCase()} ${approved ? '✓ (APPROVED)' : '❌ (REJECTED)'}
• Evaluation Item: ${complaint.question_title}
• Extra Marks Awarded: ${approved ? `+${numericExtra} Marks` : '0 Marks'}
• New Final Score: ${complaint.current_marks} Marks
• Faculty Remarks: "${complaint.resolution_note}"

Log in to your DSATM Student Portal to view your updated continuous assessment score sheet.
  `;

  try {
    await sendEmail(studentEmail, emailSubject, emailBody.trim());
    console.log(`[Email Sent] Resolution notification delivered to Student (${studentEmail}) - Status: ${newStatus}`);
  } catch (err) {
    console.error("Failed to send resolution email to student:", err.message);
  }

  // Send In-App Notification to Student
  if (complaint.student_id) {
    await notify(
      complaint.student_id,
      "marks_published",
      `💬 Complaint ${newStatus.toUpperCase()}: ${subjectLabel}`,
      `Your complaint for ${subjectLabel} was ${newStatus}. Faculty remarks: "${complaint.resolution_note.substring(0, 50)}..."`
    );
  }

  return complaint;
}

module.exports = {
  getStudentComplaints,
  getAllComplaints,
  createComplaint,
  resolveComplaint,
};
