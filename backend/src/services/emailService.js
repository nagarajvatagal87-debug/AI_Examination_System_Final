const { sendEmail, notify, notifyResultsPublished } = require("./notification.service");

module.exports = {
  sendEmail,
  notify,
  notifyResultsPublished,
  // Detailed notification helpers matching PDF Section 25:
  sendMaterialPublishedEmail: async (toEmail, studentName, subjectName, materialTitle) => {
    return sendEmail(
      toEmail,
      `📚 New Course Material Published: ${subjectName}`,
      `Hello ${studentName},\n\nNew course material "${materialTitle}" has been published for ${subjectName}.\nLog in to your Student Portal to view the document and ask questions via the Grounded AI Study Assistant.`
    );
  },
  sendInternalResultEmail: async (toEmail, studentName, examTitle, score, maxScore) => {
    const isPass = Number(score) >= (Number(maxScore) * 0.4);
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 30px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Autonomous Institute under VTU | Department of MCA</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Answer Sheet Evaluated</h3>
            <p style="font-size: 14px; line-height: 1.6;">Hi <strong>${studentName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6;">Your answer sheet for <strong>${examTitle}</strong> has been evaluated and verified by your Subject Faculty using RAG AI Course Notes Grounding.</p>
            
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">Evaluated Score</div>
              <div style="font-size: 38px; font-weight: 900; color: #2563eb; margin: 8px 0;">${score} <span style="font-size: 20px; color: #64748b; font-weight: 500;">/ ${maxScore}</span></div>
              <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${isPass ? '#dcfce7' : '#fee2e2'}; color: ${isPass ? '#15803d' : '#b91c1c'}; margin-top: 4px;">
                ${isPass ? '✓ Verified & Eligible' : '⚠️ Evaluated'}
              </div>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
              <strong>RAG Grounding:</strong> Answers evaluated against official Subject Course Notes & VTU Rubric.
            </p>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
                Log in to DSATM Student Portal
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            © DSATM Examination Control & RAG AI Assessment System
          </div>
        </div>
      </div>
    `;

    return sendEmail(
      toEmail,
      `Answer Sheet Evaluated - ${examTitle}`,
      `Hi ${studentName},\n\nYour answer sheet for "${examTitle}" has been evaluated by your Subject Faculty.\n\nEvaluated Score: ${score} / ${maxScore}\n\nLog in to your DSATM Student Portal to view detailed question-by-question feedback.`,
      html
    );
  },
  sendComplaintStatusEmail: async (toEmail, studentName, examTitle, status, responseText) => {
    return sendEmail(
      toEmail,
      `💬 Update on Internal Mark Complaint: ${examTitle}`,
      `Hello ${studentName},\n\nYour internal mark complaint for "${examTitle}" has been reviewed by your subject faculty.\n\nStatus: ${status.toUpperCase()}\nFaculty Feedback: ${responseText}`
    );
  },
  sendHodMessageEmail: async (toEmail, recipientName, hodName, messageBody) => {
    return sendEmail(
      toEmail,
      `📩 Message from Head of Department (${hodName})`,
      `Hello ${recipientName},\n\n${hodName} (HOD) sent you a message:\n\n"${messageBody}"\n\nLog in to your portal to reply.`
    );
  }
};
