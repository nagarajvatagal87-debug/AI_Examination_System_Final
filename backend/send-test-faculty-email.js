const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { sendEmail } = require("./src/services/notification.service.js");
const { generateAcademicCalendarHtml } = require("./src/services/calendarService.js");

async function run() {
  const targetEmail = "nagarajvatagal2003@gmail.com";
  const recipientName = "Prof. Nagaraj Vatagal";
  const recipientRole = "faculty";

  const event = {
    id: "mca-cal-faculty-preview-ia1",
    title: "Internal Assessment 1 (IA-1)",
    event_type: "Internal Examination",
    department_id: "37909cba-a75d-428e-9181-fddf9920fb0b",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-05",
    end_date: "2026-11-05",
    start_time: "10:00 AM",
    description: "Continuous Internal Evaluation (CIE-1) for 3rd Semester MCA students covering Unit 1 & Unit 2 VTU curriculum. Scheme of valuation and question rubrics are published in your Faculty Valuation Desk.",
    location: "MCA Seminar Hall & Labs 1-4, DSATM Campus",
    audience: ["students", "faculty", "hod", "principal"],
    status: "PUBLISHED",
  };

  const cleanSubjectTitle = String(event.title).replace(/^Copy\s+of\s+/i, "").trim();
  const emailSubject = `📢 DSATM Academic Alert: ${event.event_type} - ${cleanSubjectTitle}`;

  const eventDateFormatted = new Date(event.start_date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const emailContent = `Dear ${recipientName},

A new official academic event has been published on the DSATM Portal:

📌 Event: ${cleanSubjectTitle}
🏷️ Category: ${event.event_type}
📅 Scheduled Date: ${eventDateFormatted}
📍 Location: ${event.location}
📝 Details: ${event.description}

Please log in to the Faculty Portal to view invigilation duties, course rubrics, and the answer verification queue.

Regards,
Dayananda Sagar Academy of Technology & Management (DSATM)`;

  const emailHtml = generateAcademicCalendarHtml({
    event,
    recipientName,
    recipientRole,
    notificationType: "NEW_EVENT",
    notifData: { title: cleanSubjectTitle },
  });

  console.log(`Sending live test faculty email to: ${targetEmail}...`);
  await sendEmail(targetEmail, emailSubject, emailContent, emailHtml);
  console.log(`SUCCESS: Test faculty email sent to ${targetEmail}`);
}

run().catch((err) => {
  console.error("FATAL ERROR sending email:", err);
  process.exit(1);
});
