const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { generateAcademicCalendarHtml } = require("./src/services/calendarService.js");

const sampleEvent = {
  id: "mca-cal-test-ia1",
  title: "Internal Assessment 1 (IA-1)",
  event_type: "Internal Examination",
  department_id: "37909cba-a75d-428e-9181-fddf9920fb0b",
  program: "MCA",
  semester: "III",
  academic_year: "2026-27",
  start_date: "2026-11-05",
  end_date: "2026-11-05",
  start_time: "10:00 AM",
  description: "Continuous Internal Evaluation (CIE-1) for 3rd Semester MCA students covering Unit 1 & Unit 2 VTU curriculum. Scheme of valuation and rubrics are published in the Faculty Valuation Desk.",
  location: "MCA Seminar Hall & Labs 1-4, DSATM Campus",
  audience: ["students", "faculty", "hod", "principal"],
  status: "PUBLISHED",
};

const facultyRecipient = {
  full_name: "Prof. Nagaraj Vatagal",
  email: "nagarajvatagal2003@gmail.com",
  role: "faculty",
};

const cleanSubjectTitle = String(sampleEvent.title).replace(/^Copy\s+of\s+/i, "").trim();
const emailSubject = `📢 DSATM Academic Alert: ${sampleEvent.event_type} - ${cleanSubjectTitle}`;

const eventDateFormatted = new Date(sampleEvent.start_date).toLocaleDateString("en-IN", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const emailContent = `Dear ${facultyRecipient.full_name},

A new official academic event has been published on the DSATM Portal:

📌 Event: ${cleanSubjectTitle}
🏷️ Category: ${sampleEvent.event_type}
📅 Scheduled Date: ${eventDateFormatted}
📍 Location: ${sampleEvent.location}
📝 Details: ${sampleEvent.description}

Please log in to the Faculty Portal to view invigilation duties, course rubrics, and the answer verification queue.

Regards,
Dayananda Sagar Academy of Technology & Management (DSATM)`;

const emailHtml = generateAcademicCalendarHtml({
  event: sampleEvent,
  recipientName: facultyRecipient.full_name,
  recipientRole: facultyRecipient.role,
  notificationType: "NEW_EVENT",
  notifData: { title: cleanSubjectTitle },
});

// Write to frontend public directory so user can open in browser at http://localhost:5173/faculty-email-preview.html
const publicOutPath = path.resolve(__dirname, "../frontend/public/faculty-email-preview.html");
fs.writeFileSync(publicOutPath, emailHtml, "utf8");

console.log("=== FACULTY EMAIL SIMULATION TEST (NO EMAIL SENT) ===");
console.log("Recipient Email :", facultyRecipient.email);
console.log("Recipient Role  :", facultyRecipient.role);
console.log("Recipient Name  :", facultyRecipient.full_name);
console.log("Email Subject   :", emailSubject);
console.log("HTML Preview    :", publicOutPath);
console.log("Browser URL     : http://localhost:5173/faculty-email-preview.html");
console.log("====================================================");
