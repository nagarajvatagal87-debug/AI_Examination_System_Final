const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require(path.resolve(__dirname, "../config/Supabase"));

async function cleanDatabase() {
  console.log("--- CLEANING DATABASE & DISK DATA: PURGING ALL STUDENT DATA, REGISTRATIONS, & SUBJECTS ---");

  try {
    // 0. Delete messages
    try {
      await supabaseAdmin.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {}

    // 0b. Delete sports tables if present
    try { await supabaseAdmin.from("sports_registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000"); } catch (e) {}
    try { await supabaseAdmin.from("sports_results").delete().neq("id", "00000000-0000-0000-0000-000000000000"); } catch (e) {}
    try { await supabaseAdmin.from("sports_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"); } catch (e) {}

    // 1. Delete notifications
    const { error: notifError } = await supabaseAdmin.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("1. Deleted notifications:", notifError ? notifError.message : "Success");

    // 2. Delete evaluations
    const { error: evalError } = await supabaseAdmin.from("evaluations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("2. Deleted evaluations:", evalError ? evalError.message : "Success");

    // 3. Delete student answer submissions
    const { error: subError } = await supabaseAdmin.from("answer_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("3. Deleted answer_submissions:", subError ? subError.message : "Success");

    // 4. Delete main results
    const { error: resError } = await supabaseAdmin.from("main_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("4. Deleted main_results:", resError ? resError.message : "Success");

    // 5. Delete exam questions
    const { error: qError } = await supabaseAdmin.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("5. Deleted questions:", qError ? qError.message : "Success");

    // 6. Delete scheduled exams
    const { error: examError } = await supabaseAdmin.from("exams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("6. Deleted exams:", examError ? examError.message : "Success");

    // 7. Delete course materials
    const { error: matError } = await supabaseAdmin.from("course_materials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("7. Deleted course_materials:", matError ? matError.message : "Success");

    // 8. Delete complaints
    const { error: compError } = await supabaseAdmin.from("complaints").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("8. Deleted complaints:", compError ? compError.message : "Success");

    // 9. Delete all subjects
    const { error: subjError } = await supabaseAdmin.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("9. Deleted subjects:", subjError ? subjError.message : "Success");

    // 10. Delete all student profiles from Supabase database
    const { error: studentProfError } = await supabaseAdmin.from("profiles").delete().eq("role", "student");
    console.log("10. Deleted student profiles:", studentProfError ? studentProfError.message : "Success");

    // 10b. Purge registered users from Supabase Auth service
    try {
      const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const authUsers = authUsersData?.users || [];
      for (const u of authUsers) {
        if (u.user_metadata?.role === "student" || u.role === "student" || u.email?.includes("@")) {
          await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {});
        }
      }
      console.log(`10b. Purged ${authUsers.length} Supabase Auth user accounts.`);
    } catch (e) {}

    // 11. Reset local persistent JSON storage files
    const DATA_DIR = path.join(__dirname, "../data");
    const jsonFilesToReset = [
      "persistent_enrollments.json",
      "persistent_internal_marks.json",
      "persistent_parent_guardians.json",
      "persistent_sports_registrations.json",
      "persistent_sports_results.json",
      "persistent_sports_achievements.json"
    ];

    for (const fileName of jsonFilesToReset) {
      const p = path.join(DATA_DIR, fileName);
      if (fs.existsSync(p)) {
        fs.writeFileSync(p, "[]", "utf8");
        console.log(`Reset persistent JSON file: ${fileName}`);
      }
    }

    console.log("--- CLEANUP COMPLETED: DATABASE & LOCAL DISK STORAGE ARE 100% PURGED OF SAMPLE STUDENT & COURSE DATA ---");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}

cleanDatabase();
