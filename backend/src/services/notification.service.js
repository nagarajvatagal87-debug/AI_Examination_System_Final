const { supabaseAdmin } = require("../../config/Supabase");
const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const transporter = resend ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail(to, subject, body, html = null) {
  if (!to) return;
  try {
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
        to,
        subject,
        text: body,
        html: html || body,
      });
    } else if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: body,
        html: html || body,
      });
    } else {
      console.warn("No email provider configured — skipping:", subject, "->", to);
    }
  } catch (err) {
    console.error("sendEmail failed:", err.message);
  }
}

async function notify(recipientId, type, title, body, relatedExamId = null) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    recipient_id: recipientId, type, title, body, related_exam_id: relatedExamId,
  });
  if (error) console.error("Failed to create notification:", error.message);
}

async function notifyResultsPublished(examId) {
  const { data: exam } = await supabaseAdmin
    .from("exams").select("id, title, subject_id, subjects(department_id)").eq("id", examId).single();
  if (!exam) return;

  const departmentId = exam.subjects.department_id;

  const { data: rankings } = await supabaseAdmin.from("rankings").select("student_id").eq("exam_id", examId);
  for (const r of rankings || []) {
    await notify(r.student_id, "marks_published", "Your marks are out", `Marks for "${exam.title}" have been published.`, examId);
  }

  const { data: department } = await supabaseAdmin.from("departments").select("hod_id").eq("id", departmentId).single();
  if (department?.hod_id) {
    await notify(department.hod_id, "department_results_published", "Department results published", `Results for "${exam.title}" have been published.`, examId);
  }

  const { data: principals } = await supabaseAdmin.from("profiles").select("id").eq("role", "principal");
  for (const p of principals || []) {
    await notify(p.id, "exam_results_published", "Examination results published", `Results for "${exam.title}" have been published.`, examId);
  }
}

module.exports = { notify, notifyResultsPublished, sendEmail };