const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { sendEmail } = require("./src/services/notification.service.js");
const { generateAcademicCalendarHtml } = require("./src/services/calendarService.js");

async function run() {
  const targetEmail = "nagarajvatagal2003@gmail.com";

  // Official Event for 28th October 2026
  const event = {
    id: "mca-cal-1793107343417-jd2km",
    title: "Internal Assessment 1 (IA-1)",
    event_type: "Internal Examination",
    department_id: "37909cba-a75d-428e-9181-fddf9920fb0b",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-28",
    end_date: "2026-10-28",
    start_time: "10:00 AM",
    description: "Continuous Internal Evaluation (CIE-1) for 3rd Semester MCA students covering Unit 1 & Unit 2 VTU curriculum.",
    location: "MCA Department, DSATM Campus",
    audience: ["students", "faculty", "hod", "principal"],
    status: "PUBLISHED",
  };

  const cleanSubjectTitle = String(event.title).replace(/^Copy\s+of\s+/i, "").trim();
  const eventDateFormatted = new Date(event.start_date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. STUDENT EMAIL VERSION
  console.log("\n==========================================");
  console.log("1. PREPARING & DISPATCHING STUDENT EMAIL...");
  console.log("==========================================");

  const studentRecipient = {
    full_name: "Nagaraj Vatagal",
    email: targetEmail,
    role: "student",
  };

  const studentSubject = `📢 DSATM Academic Alert: ${event.event_type} - ${cleanSubjectTitle} [STUDENT COPY]`;
  const studentContent = `Dear ${studentRecipient.full_name},

A new official academic event has been published on the DSATM Portal:

📌 Event: ${cleanSubjectTitle}
🏷️ Category: ${event.event_type}
📅 Scheduled Date: ${eventDateFormatted}
📍 Location: ${event.location}
📝 Details: ${event.description}

Please log in to your Student Portal to view full exam seating, hall allotment, and syllabus guidelines.

Regards,
Dayananda Sagar Academy of Technology & Management (DSATM)`;

  const studentHtml = generateAcademicCalendarHtml({
    event,
    recipientName: studentRecipient.full_name,
    recipientRole: studentRecipient.role,
    notificationType: "NEW_EVENT",
    notifData: { title: cleanSubjectTitle },
  });

  fs.writeFileSync(
    path.resolve(__dirname, "../frontend/public/student-email-preview.html"),
    studentHtml,
    "utf8"
  );

  await sendEmail(targetEmail, studentSubject, studentContent, studentHtml);
  console.log(`[DELIVERED] Student copy sent to ${targetEmail} (Date: ${eventDateFormatted})`);

  // Small pause between dispatches to allow Gmail SMTP cleanly process
  await new Promise((r) => setTimeout(r, 2000));

  // 2. FACULTY EMAIL VERSION
  console.log("\n==========================================");
  console.log("2. PREPARING & DISPATCHING FACULTY EMAIL...");
  console.log("==========================================");

  const facultyRecipient = {
    full_name: "Prof. Nagaraj Vatagal",
    email: targetEmail,
    role: "faculty",
  };

  const facultySubject = `📢 DSATM Academic Alert: ${event.event_type} - ${cleanSubjectTitle} [FACULTY COPY]`;
  const facultyContent = `Dear Prof. ${facultyRecipient.full_name},

A new official academic event has been published on the DSATM Portal:

📌 Event: ${cleanSubjectTitle}
🏷️ Category: ${event.event_type}
📅 Scheduled Date: ${eventDateFormatted}
📍 Location: ${event.location}
📝 Details: ${event.description}

Please log in to your DSATM Faculty Portal to view invigilation duties, course rubrics, and the answer verification queue.

Regards,
Dayananda Sagar Academy of Technology & Management (DSATM)`;

  const facultyHtml = generateAcademicCalendarHtml({
    event,
    recipientName: facultyRecipient.full_name,
    recipientRole: facultyRecipient.role,
    notificationType: "NEW_EVENT",
    notifData: { title: cleanSubjectTitle },
  });

  fs.writeFileSync(
    path.resolve(__dirname, "../frontend/public/faculty-email-preview.html"),
    facultyHtml,
    "utf8"
  );

  await sendEmail(targetEmail, facultySubject, facultyContent, facultyHtml);
  console.log(`[DELIVERED] Faculty copy sent to ${targetEmail} (Date: ${eventDateFormatted})`);

  console.log("\n==========================================");
  console.log("SUCCESS! Both Student & Faculty emails sent to:", targetEmail);
  console.log("Event Date Displayed: Wednesday, 28 October 2026");
  console.log("==========================================");
}

run().catch((err) => {
  console.error("Error sending emails:", err);
  process.exit(1);
});
