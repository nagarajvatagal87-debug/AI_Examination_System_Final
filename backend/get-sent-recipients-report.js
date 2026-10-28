const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { supabaseAdmin } = require("./config/Supabase");

async function generateReport() {
  const logFile = path.resolve(__dirname, "./data/persistent_calendar_notif_logs.json");
  const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));

  // Fetch all profiles from Supabase to match user details
  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, department_id, semester");

  const userMap = {};
  if (users) {
    users.forEach(u => {
      userMap[u.id] = u;
      if (u.email) userMap[u.email.toLowerCase()] = u;
    });
  }

  // Filter logs for today (2026-10-28)
  const todayLogs = logs.filter(l => l.sent_at && l.sent_at.startsWith("2026-10-28"));

  const sentLogs = todayLogs.filter(l => l.status === "SENT");
  const failedLogs = todayLogs.filter(l => l.status === "FAILED");

  // Deduplicate by recipient email
  const successfulRecipients = {};
  sentLogs.forEach(l => {
    const email = l.user_email?.toLowerCase();
    if (!email) return;
    if (!successfulRecipients[email]) {
      const profile = userMap[l.user_id] || userMap[email] || {};
      successfulRecipients[email] = {
        name: profile.full_name || "N/A",
        role: profile.role || "student",
        email: email,
        sent_at: l.sent_at,
        event_id: l.event_id,
      };
    }
  });

  const failedRecipients = {};
  failedLogs.forEach(l => {
    const email = l.user_email?.toLowerCase();
    if (!email) return;
    // only if not already successfully received in a prior/later retry
    if (!successfulRecipients[email] && !failedRecipients[email]) {
      const profile = userMap[l.user_id] || userMap[email] || {};
      failedRecipients[email] = {
        name: profile.full_name || "N/A",
        role: profile.role || "student",
        email: email,
        failed_at: l.sent_at,
        error: (l.failure_reason || "").split("\n")[0],
      };
    }
  });

  const sentList = Object.values(successfulRecipients);
  const failedList = Object.values(failedRecipients);

  const sentFaculty = sentList.filter(r => r.role === "faculty");
  const sentHOD = sentList.filter(r => r.role === "hod" || r.role === "principal");
  const sentStudents = sentList.filter(r => r.role === "student");

  console.log("=================================================");
  console.log("EMAIL DELIVERY REPORT FOR TODAY (28 OCT 2026)");
  console.log("=================================================");
  console.log(`TOTAL UNIQUE RECIPIENTS DELIVERED : ${sentList.length}`);
  console.log(` - Faculty Delivered             : ${sentFaculty.length}`);
  console.log(` - HOD / Leadership Delivered    : ${sentHOD.length}`);
  console.log(` - Students Delivered            : ${sentStudents.length}`);
  console.log(`TOTAL UNIQUE RECIPIENTS FAILED    : ${failedList.length}`);
  console.log("=================================================\n");

  console.log("--- 1. FACULTY WHO GOT THE EMAIL ---");
  console.log(JSON.stringify(sentFaculty, null, 2));

  console.log("\n--- 2. HODs / PRINCIPAL WHO GOT THE EMAIL ---");
  console.log(JSON.stringify(sentHOD, null, 2));

  console.log(`\n--- 3. STUDENTS WHO GOT THE EMAIL (${sentStudents.length} Students) ---`);
  console.log(JSON.stringify(sentStudents, null, 2));

  console.log(`\n--- 4. USERS WHO FAILED / DID NOT GET EMAIL (${failedList.length} Users) ---`);
  console.log(JSON.stringify(failedList, null, 2));
}

generateReport().catch(console.error);
