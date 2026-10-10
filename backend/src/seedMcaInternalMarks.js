const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");
const { saveInternalMarks, setSubjectStatus } = require("./services/internalMarksStore");
const { enrollMultipleStudents } = require("./services/enrollmentStore");

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function seedMcaInternalMarks() {
  console.log("=== SEEDING REAL DYNAMIC FACULTY INTERNAL MARKS FOR ALL MCA STUDENTS ===");

  try {
    // 1. Fetch all MCA Departments
    const { data: mcaDepts } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .or("name.ilike.%MCA%,name.ilike.%Computer Applications%");

    const deptIds = (mcaDepts || []).map((d) => d.id);
    deptIds.push("37909cba-a75d-428e-9181-fddf9920fb0b", "e1ddfa87-ddbb-4dae-baf9-e435e376c245", "f7767769-1b93-4103-b9f3-d3c39f013388");
    const uniqueDeptIds = Array.from(new Set(deptIds.filter(Boolean)));

    // 2. Fetch all MCA Students
    const { data: students, error: stErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, department_id")
      .eq("role", "student")
      .in("department_id", uniqueDeptIds)
      .order("registration_no", { ascending: true });

    if (stErr) console.error("Error fetching students:", stErr.message);

    let allMcaStudents = students || [];
    if (allMcaStudents.length === 0) {
      const { data: allSt } = await supabaseAdmin.from("profiles").select("id, full_name, registration_no, semester, department_id").eq("role", "student");
      allMcaStudents = allSt || [];
    }

    console.log(`Found ${allMcaStudents.length} MCA Student(s).`);

    // 3. Fetch all MCA Subjects
    let { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, department_id");

    let mcaSubjects = (subjects || []).filter((s) => uniqueDeptIds.includes(s.department_id) || (s.name && s.name.toLowerCase().includes("mca")));

    if (mcaSubjects.length === 0) {
      const targetDeptId = uniqueDeptIds[0] || "37909cba-a75d-428e-9181-fddf9920fb0b";
      const defaultSubs = [
        { name: "Database Management Systems", code: "23MCA31", department_id: targetDeptId },
        { name: "Web Application Development", code: "23MCA32", department_id: targetDeptId },
        { name: "Software Engineering & Agile", code: "23MCA33", department_id: targetDeptId },
        { name: "Cloud Computing & DevOps", code: "23MCA34", department_id: targetDeptId },
      ];
      const { data: insertedSubs } = await supabaseAdmin.from("subjects").insert(defaultSubs).select();
      mcaSubjects = insertedSubs || defaultSubs;
    }

    console.log(`Targeting ${mcaSubjects.length} MCA Subject(s).`);
    const studentIds = allMcaStudents.map((s) => s.id);

    // 4. Seed realistic internal evaluations ONLY for enrolled students of each subject
    const { getEnrolledStudentIds } = require("./services/enrollmentStore");

    for (const sub of mcaSubjects) {
      const enrolledStudentIds = getEnrolledStudentIds(sub.id);
      const targetStudents = enrolledStudentIds.length > 0 
        ? allMcaStudents.filter((s) => enrolledStudentIds.includes(s.id))
        : allMcaStudents;

      const marksArray = targetStudents.map((st, idx) => {
        const studentCode = st.registration_no || st.id || `st-${idx}`;
        const subCodeStr = sub.code || sub.name || `sub-${sub.id}`;
        const h = hashString(`${studentCode}:${subCodeStr}:${idx}`);

        let i1, i2, ass, proj;

        // Specific USNs (bottom ~8% of roster) get low internal score (<25)
        const isDetainedCandidate = (idx >= targetStudents.length - 6) || ((h % 100) < 7);

        if (isDetainedCandidate) {
          i1 = 5 + (h % 3);            // 5-7 (out of 15)
          i2 = 4 + ((h >> 2) % 4);     // 4-7 (out of 15)
          ass = 4 + ((h >> 4) % 3);    // 4-6 (out of 10)
          proj = 3 + ((h >> 6) % 3);   // 3-5 (out of 10)
        } else {
          // Varied realistic scores (27 - 49 out of 50)
          i1 = 9 + (h % 7);            // 9-15
          i2 = 8 + ((h >> 3) % 8);     // 8-15
          ass = 7 + ((h >> 5) % 4);    // 7-10
          proj = 6 + ((h >> 7) % 5);   // 6-10
        }

        const total = i1 + i2 + ass + proj;

        return {
          studentId: st.id,
          student_id: st.id,
          internal1: i1,
          internal1_marks: i1,
          internal2: i2,
          internal2_marks: i2,
          assignment: ass,
          assignment_marks: ass,
          project: proj,
          project_marks: proj,
          internal3: proj,
          internal3_marks: proj,
          totalInternal: total,
          total_internal_marks: total,
          isEligible: total >= 25,
          is_eligible: total >= 25,
          status: "approved_by_hod",
          hod_approved: true,
        };
      });

      await saveInternalMarks(sub.id, marksArray);
      await setSubjectStatus(sub.id, "approved_by_hod");
      console.log(`✓ Seeded dynamic marks for ${marksArray.length} enrolled students in ${sub.name}.`);
    }

    console.log("=== SUCCESSFULLY SEEDED UNIQUE REALISTIC INTERNAL MARKS FOR MCA ===");
  } catch (err) {
    console.error("Error in seedMcaInternalMarks:", err);
  }
}

if (require.main === module) {
  seedMcaInternalMarks().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seedMcaInternalMarks };
