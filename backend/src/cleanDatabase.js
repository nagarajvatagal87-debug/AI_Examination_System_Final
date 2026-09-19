const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

async function cleanDatabase() {
  console.log("--- CLEANING DATABASE: PURGING ALL STUDENT PROFILES AND SUBJECTS ---");

  try {
    // 0. Delete notifications
    const { error: notifError } = await supabaseAdmin.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("0. Deleted notifications:", notifError ? notifError.message : "Success");

    // 1. Delete evaluations
    const { error: evalError } = await supabaseAdmin.from("evaluations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("1. Deleted evaluations:", evalError ? evalError.message : "Success");

    // 2. Delete student answer submissions
    const { error: subError } = await supabaseAdmin.from("answer_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("2. Deleted answer_submissions:", subError ? subError.message : "Success");

    // 3. Delete main results
    const { error: resError } = await supabaseAdmin.from("main_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("3. Deleted main_results:", resError ? resError.message : "Success");

    // 4. Delete exam questions
    const { error: qError } = await supabaseAdmin.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("4. Deleted questions:", qError ? qError.message : "Success");

    // 5. Delete scheduled exams
    const { error: examError } = await supabaseAdmin.from("exams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("5. Deleted exams:", examError ? examError.message : "Success");

    // 6. Delete course materials
    const { error: matError } = await supabaseAdmin.from("course_materials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("6. Deleted course_materials:", matError ? matError.message : "Success");

    // 7. Delete complaints
    const { error: compError } = await supabaseAdmin.from("complaints").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("7. Deleted complaints:", compError ? compError.message : "Success");

    // 8. Delete all subjects
    const { error: subjError } = await supabaseAdmin.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("8. Deleted subjects:", subjError ? subjError.message : "Success");

    // 9. Delete all student profiles
    const { error: studentProfError } = await supabaseAdmin.from("profiles").delete().eq("role", "student");
    console.log("9. Deleted student profiles:", studentProfError ? studentProfError.message : "Success");

    console.log("--- CLEANUP COMPLETED: DATABASE IS NOW 100% EMPTY & READY FOR HOD INPUT ---");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}

cleanDatabase();
