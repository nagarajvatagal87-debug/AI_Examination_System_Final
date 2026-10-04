const { supabaseAdmin } = require("../../config/Supabase");
const { Resend } = require("resend");
const nodemailer = require("nodemailer");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const hasSmtpConfig = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = (resend || !hasSmtpConfig) ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function wrapInHtmlTemplate(subject, bodyText) {
  const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const dsiLogoUrl = `${portalUrl}/dsi-logo.png`;
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
          
          <!-- Header with DSI Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 26px 30px; text-align: center; color: #ffffff;">
              <div style="margin-bottom: 12px;">
                <img src="${dsiLogoUrl}" alt="DSI Logo" style="height: 56px; width: auto; max-width: 200px; object-fit: contain; display: inline-block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));" />
              </div>
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
      console.log(`[EMAIL DISPATCH via Resend] Sent to ${to}: ${subject}`);
    } else if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: body,
        html: finalHtml,
      });
      console.log(`[EMAIL DISPATCH via SMTP] Sent to ${to}: ${subject}`);
    } else {
      console.log(`[EMAIL DISPATCH LOGGED] To: ${to} | Subject: ${subject}`);
    }
  } catch (err) {
    console.error("sendEmail failed (handled):", err.message);
  }
}

async function notify(recipientId, type, title, body, relatedExamId = null) {
  let notifType = type || "general";
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      recipient_id: recipientId, type: notifType, title, body, related_exam_id: relatedExamId,
    });
    if (error && error.message.includes("enum")) {
      try {
        await supabaseAdmin.from("notifications").insert({
          recipient_id: recipientId, type: "general", title, body, related_exam_id: relatedExamId,
        });
      } catch (e) {}
    } else if (error) {
      console.error("Failed to create notification:", error.message);
    }
  } catch (err) {
    console.warn("Notification insert caught error (handled):", err.message);
  }
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

async function sendTrilingualAbsenceEmail({ toEmail, studentName, usn, subjectName, subjectCode, dateStr, preferredLanguage = "TRILINGUAL" }) {
  const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const subject = `⚠️ Attendance Alert: ${studentName} was ABSENT for ${subjectName} / ಹಾಜರಾತಿ ಸೂಚನೆ`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.1); border: 1px solid #e2e8f0;">
          
          <!-- Top Banner with DSI Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 24px 24px; text-align: center; color: #ffffff;">
              <div style="margin-bottom: 10px;">
                <img src="${portalUrl}/dsi-logo.png" alt="DSI Logo" style="height: 52px; width: auto; max-width: 180px; object-fit: contain; display: inline-block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));" />
              </div>
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8; margin-bottom: 4px;">
                🎓 DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
              </div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; line-height: 1.3;">
                STUDENT ABSENCE NOTIFICATION
              </h1>
              <div style="margin-top: 6px; font-size: 13px; color: #93c5fd; font-weight: 700;">
                ವಿದ್ಯಾರ್ಥಿ ಗೈರುಹಾಜರಿ ಸೂಚನೆ | छात्र उपस्थिति सूचना
              </div>
            </td>
          </tr>

          <!-- Key Details Card -->
          <tr>
            <td style="padding: 20px 24px 10px 24px;">
              <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 18px;">
                <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #1e293b;">
                  <tr>
                    <td style="font-weight: 700; color: #64748b; width: 150px;">Student Name / ಹೆಸರು:</td>
                    <td style="font-weight: 900; color: #0f172a; font-size: 15px;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #64748b;">USN / ನೋಂದಣಿ ಸಂಖ್ಯೆ:</td>
                    <td style="font-weight: 800; color: #2563eb;">${usn}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #64748b;">Subject / ವಿಷಯ:</td>
                    <td style="font-weight: 800; color: #0f172a;">${subjectName} (${subjectCode})</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #64748b;">Date / ದಿನಾಂಕ:</td>
                    <td style="font-weight: 700; color: #334155;">${dateStr}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #64748b;">Status / ಸ್ಥಿತಿ:</td>
                    <td>
                      <span style="background: #dc2626; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; display: inline-block;">
                        ⚠️ ABSENT / ಗೈರುಹಾಜರಿ / अनुपस्थित
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Section 1: English Message -->
          <tr>
            <td style="padding: 10px 24px; color: #334155;">
              <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 800; margin-bottom: 4px;">🇬🇧 English Notification</div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b;">
                  <strong>Dear Parent/Guardian,</strong><br/>
                  This is an official academic attendance alert from DSATM. Your ward <strong>${studentName}</strong> (${usn}) was marked <strong>ABSENT</strong> for <strong>${subjectName}</strong> on <strong>${dateStr}</strong>.<br/>
                  Please log in to the student portal or contact the subject faculty for further details.
                </p>
              </div>
            </td>
          </tr>

          <!-- Section 2: Kannada Message (ಕನ್ನಡ) -->
          <tr>
            <td style="padding: 0 24px 10px 24px; color: #334155;">
              <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 14px 16px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: #b45309; font-weight: 800; margin-bottom: 4px;">🇮🇳 ಕನ್ನಡ (Kannada Notification)</div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b;">
                  <strong>ಗೌರವಾನ್ವಿತ ಪೋಷಕರೇ,</strong><br/>
                  ಇದು DSATM ಕಾಲೇಜಿನಿಂದ ಅಧಿಕೃತ ಶೈಕ್ಷಣಿಕ ಹಾಜರಾತಿ ಸೂಚನೆಯಾಗಿದೆ. ನಿಮ್ಮ ಮಗು/ವಿದ್ಯಾರ್ಥಿ <strong>${studentName}</strong> (USN: ${usn}) ಇಂದು (${dateStr}) <strong>${subjectName}</strong> ತರಗತಿಗೆ <strong>ಗೈರುಹಾಜರಾಗಿದ್ದಾರೆ (ABSENT)</strong>.<br/>
                  ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ದಯವಿಟ್ಟು ಕಾಲೇಜು ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ ಅಥವಾ ವಿಷಯ ಶಿಕ್ಷಕರನ್ನು ಸಂಪರ್ಕಿಸಿ.
                </p>
              </div>
            </td>
          </tr>

          <!-- Section 3: Hindi Message (हिंदी) -->
          <tr>
            <td style="padding: 0 24px 10px 24px; color: #334155;">
              <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: #15803d; font-weight: 800; margin-bottom: 4px;">🇮🇳 हिंदी (Hindi Notification)</div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b;">
                  <strong>आदरणीय अभिभावक,</strong><br/>
                  यह DSATM कॉलेज की ओर से आधिकारिक उपस्थिति सूचना है। आपका बच्चा <strong>${studentName}</strong> (USN: ${usn}) दिनांक ${dateStr} को <strong>${subjectName}</strong> की कक्षा में <strong>अनुपस्थित (ABSENT)</strong> था।<br/>
                  अधिक जानकारी के लिए कृपया कॉलेज पोर्टल पर लॉगिन करें या विषय संकाय से संपर्क करें।
                </p>
              </div>
            </td>
          </tr>

          <!-- LMS Portal Button -->
          <tr>
            <td style="padding: 10px 24px 24px 24px; text-align: center;">
              <a href="${portalUrl}" target="_blank" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-size: 14px; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(2,132,199,0.3);">
                🚀 Open DSATM Parent Portal / ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 800; color: #334155; margin-bottom: 2px;">Dayananda Sagar Academy of Technology & Management (DSATM)</div>
              <div>Autonomous Institute under VTU | Department of Computer Applications</div>
              <div style="margin-top: 8px; font-size: 10px; color: #94a3b8;">
                Multilingual Parent Alert System (English • ಕನ್ನಡ • हिंदी)
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

  return sendEmail(toEmail, subject, `Student ${studentName} (${usn}) was marked ABSENT for ${subjectName} on ${dateStr}.`, html);
}

module.exports = { notify, notifyResultsPublished, sendEmail, sendTrilingualAbsenceEmail };