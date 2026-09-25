const { supabaseAdmin } = require("../../config/Supabase");
const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const transporter = resend ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function wrapInHtmlTemplate(subject, bodyText) {
  const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const rawStr = String(bodyText || "");

  const formattedContent = rawStr
    .split(/\n\n+/)
    .map((para) => {
      const cleanPara = para.trim().replace(/\n/g, "<br/>");
      return `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #334155;">${cleanPara}</p>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 26px 30px; text-align: center; color: #ffffff;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px;">
                🎓 Official Academic & Examination Notification
              </div>
              <h1 style="margin: 0; font-size: 19px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; line-height: 1.3;">
                DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                Autonomous Institute under VTU | Department of Computer Applications
              </p>
            </td>
          </tr>

          <!-- Subject Banner -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 800; letter-spacing: 0.8px;">Notice Subject</div>
                <h2 style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 17px; font-weight: 800;">${subject}</h2>
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 16px 30px 24px 30px; color: #334155;">
              <div style="background: #ffffff; border-radius: 8px;">
                ${formattedContent}
              </div>

              <!-- Button -->
              <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                <a href="${portalUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-size: 14px; font-weight: 800; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
                  🚀 Open DSATM Academic Portal &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">Dayananda Sagar Academy of Technology & Management (DSATM)</div>
              <div>Opp. Art of Living, Kanakapura Main Road, Bangalore - 560082</div>
              <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                This is an official automated communication from the DSATM Exam Control & Academic Portal.<br/>
                © 2026 DSATM AI Examination & Academic Management System.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendEmail(to, subject, body, html = null) {
  if (!to) return;
  try {
    const finalHtml = html || wrapInHtmlTemplate(subject, body);
    if (resend) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
        to,
        subject,
        text: body,
        html: finalHtml,
      });
    } else if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: body,
        html: finalHtml,
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
    .from("exams")
    .select("id, title, subject_id, subjects(name, code, department_id)")
    .eq("id", examId)
    .single();
  if (!exam) return;

  const departmentId = exam.subjects?.department_id;
  const subjectName = exam.subjects?.name ? `${exam.subjects.name} (${exam.subjects.code || ''})` : 'Course Subject';

  const { data: rankings } = await supabaseAdmin.from("rankings").select("student_id").eq("exam_id", examId);
  for (const r of rankings || []) {
    await notify(r.student_id, "marks_published", `Results Published: ${subjectName}`, `Official marks for ${subjectName} (${exam.title}) have been published.`, examId);
  }

  const { data: department } = await supabaseAdmin.from("departments").select("hod_id").eq("id", departmentId).single();
  if (department?.hod_id) {
    await notify(department.hod_id, "department_results_published", `Department Results Published: ${subjectName}`, `Results for ${subjectName} (${exam.title}) have been published.`, examId);
  }

  const { data: principals } = await supabaseAdmin.from("profiles").select("id").eq("role", "principal");
  for (const p of principals || []) {
    await notify(p.id, "exam_results_published", `Examination Results Published: ${subjectName}`, `Results for ${subjectName} (${exam.title}) have been published.`, examId);
  }
}

module.exports = { notify, notifyResultsPublished, sendEmail };