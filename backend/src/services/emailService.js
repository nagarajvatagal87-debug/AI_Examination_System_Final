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
    return sendEmail(
      toEmail,
      `📊 Internal Result Announced: ${examTitle}`,
      `Hello ${studentName},\n\nYour internal examination result for "${examTitle}" has been evaluated and verified by your subject faculty.\n\nScore: ${score} / ${maxScore}\n\nLog in to your Student Portal to view detailed question-wise feedback.`
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
