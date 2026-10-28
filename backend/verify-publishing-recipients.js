const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { supabaseAdmin } = require("./config/Supabase");
const { generateAcademicCalendarHtml } = require("./src/services/calendarService");

async function checkRecipientsPreview() {
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, department_id, semester");

  const sampleEvent = {
    id: "mca-cal-test-ia1",
    title: "Internal Assessment 1 (IA-1)",
    event_type: "Internal Examination",
    department_id: "37909cba-a75d-428e-9181-fddf9920fb0b",
    program: "MCA",
    semester: "III",
    start_date: "2026-10-28",
    end_date: "2026-10-28",
    start_time: "10:00 AM",
    description: "Continuous Internal Evaluation (CIE-1) for 3rd Semester MCA students.",
    location: "MCA Department, DSATM Campus",
    audience: ["students", "faculty", "hod", "principal"],
    status: "PUBLISHED"
  };

  console.log("=== SIMULATING PUBLISH EMAIL DISPATCH FOR ALL REGISTERED USERS ===");
  console.log("Event:", sampleEvent.title, "| Date:", sampleEvent.start_date);
  console.log("------------------------------------------------------------------");

  const facultySamples = [];
  const studentSamples = [];
  const hodSamples = [];

  for (const u of users) {
    if (!u.email) continue;
    const role = (u.role || "student").toLowerCase().trim();

    const cleanSubjectTitle = String(sampleEvent.title).replace(/^Copy\s+of\s+/i, "").trim();
    const cleanRecipientName = (u.full_name || (role === "faculty" ? "Faculty" : "Student"))
      .replace(/_mca$/i, "")
      .replace(/_/g, " ")
      .trim();

    let salutation = "";
    let guidelinesType = "";
    let buttonLabel = "";
    let buttonLink = "";

    if (role === "faculty") {
      salutation = `Dear Prof. ${cleanRecipientName},`;
      guidelinesType = "📋 Faculty Invigilation & Evaluation Guidelines";
      buttonLabel = "🚀 Open Faculty Portal & Valuation Desk →";
      buttonLink = "http://localhost:5173/faculty";
      facultySamples.push({ name: cleanRecipientName, email: u.email, salutation, guidelinesType, buttonLabel, buttonLink });
    } else if (role === "student") {
      salutation = `Dear ${cleanRecipientName},`;
      guidelinesType = "📋 Mandatory Examinee Guidelines";
      buttonLabel = "🚀 Open Student Portal & Exam Desk →";
      buttonLink = "http://localhost:5173";
      if (studentSamples.length < 3) {
        studentSamples.push({ name: cleanRecipientName, email: u.email, salutation, guidelinesType, buttonLabel, buttonLink });
      }
    } else if (role === "hod") {
      salutation = `Respected Head of Department (Prof. ${cleanRecipientName}),`;
      buttonLabel = "🚀 Open HOD Department Dashboard →";
      buttonLink = "http://localhost:5173/hod";
      hodSamples.push({ name: cleanRecipientName, email: u.email, salutation, buttonLabel, buttonLink });
    }
  }

  console.log("\n👨‍🏫 SAMPLE FACULTY EMAILS GENERATED ON PUBLISH:");
  console.log(JSON.stringify(facultySamples.slice(0, 3), null, 2));

  console.log("\n🎓 SAMPLE STUDENT EMAILS GENERATED ON PUBLISH:");
  console.log(JSON.stringify(studentSamples, null, 2));

  console.log("\n🏛️ SAMPLE HOD EMAILS GENERATED ON PUBLISH:");
  console.log(JSON.stringify(hodSamples.slice(0, 2), null, 2));
}

checkRecipientsPreview().catch(console.error);
