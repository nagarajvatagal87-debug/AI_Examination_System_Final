const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

const MCA_DEPT_ID = "37909cba-a75d-428e-9181-fddf9920fb0b";

async function fixDepartmentIds() {
  console.log("=== FIXING ALL MCA STUDENT DEPARTMENT IDs ===");
  
  // 1. Update all student profiles to MCA_DEPT_ID
  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({ department_id: MCA_DEPT_ID })
    .eq("role", "student")
    .select("id, full_name, registration_no");

  if (error) {
    console.error("Error updating profiles:", error);
    return;
  }

  console.log(`Successfully updated ${updated?.length || 0} student profiles to MCA Department (${MCA_DEPT_ID}).`);

  // 2. Count total students in MCA department
  const { data: mcaStudents, error: countErr } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, registration_no")
    .eq("role", "student")
    .eq("department_id", MCA_DEPT_ID)
    .order("registration_no");

  if (countErr) {
    console.error("Error counting MCA students:", countErr);
    return;
  }

  console.log(`Total active MCA Department Students in DB: ${mcaStudents?.length || 0}`);
}

fixDepartmentIds()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
