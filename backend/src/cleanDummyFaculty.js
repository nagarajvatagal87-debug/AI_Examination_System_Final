const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

async function cleanDummyFaculty() {
  console.log("--- CLEANING DUMMY FACULTY PROFILES ---");

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "faculty");

    if (error) {
      console.error("Fetch profiles error:", error.message);
      return;
    }

    const dummyProfiles = (profiles || []).filter(
      (p) =>
        p.email?.includes("faculty_pro_") ||
        p.email?.includes("faculty_eval_") ||
        p.email?.includes("college.edu") ||
        p.full_name?.includes("Ananya Roy") ||
        p.full_name?.includes("Vision Tester")
    );

    console.log(`Found ${dummyProfiles.length} dummy faculty profiles to delete out of ${profiles.length} total.`);

    for (const p of dummyProfiles) {
      console.log(`Deleting dummy faculty: ${p.full_name} (${p.email}) - ID: ${p.id}`);
      
      try { await supabaseAdmin.from("subjects").update({ faculty_id: null }).eq("faculty_id", p.id); } catch (e) {}
      try { await supabaseAdmin.from("course_materials").update({ uploaded_by: null }).eq("uploaded_by", p.id); } catch (e) {}
      try { await supabaseAdmin.from("exams").update({ created_by: null }).eq("created_by", p.id); } catch (e) {}
      try { await supabaseAdmin.from("faculty_attendance").delete().eq("faculty_id", p.id); } catch (e) {}
      try { await supabaseAdmin.from("faculty_workloads").delete().eq("faculty_id", p.id); } catch (e) {}

      const { error: delProfErr } = await supabaseAdmin.from("profiles").delete().eq("id", p.id);
      if (delProfErr) console.warn(`Error deleting profile ${p.id}:`, delProfErr.message);

      try {
        await supabaseAdmin.auth.admin.deleteUser(p.id);
      } catch (e) {}
    }

    console.log("--- DUMMY FACULTY CLEANUP COMPLETE ---");
  } catch (err) {
    console.error("Error during dummy faculty cleanup:", err.message);
  }
}

cleanDummyFaculty();
