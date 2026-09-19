const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

async function seedMcaResults() {
  console.log("=== POPULATING MCA 87 STUDENT MAIN EXAM RESULTS ===");

  try {
    // 1. Get MCA Department
    const { data: mcaDept } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("id", "e1ddfa87-ddbb-4dae-baf9-e435e376c245")
      .single();

    if (!mcaDept) {
      console.error("MCA department not found");
      return;
    }

    // 2. Fetch all 87 MCA students
    const { data: students } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no")
      .eq("role", "student")
      .eq("department_id", mcaDept.id)
      .order("registration_no", { ascending: true });

    console.log(`Found ${students?.length || 0} MCA students`);

    // 3. Get or Create DBMS Subject
    let { data: dbmsSub } = await supabaseAdmin
      .from("subjects")
      .select("*")
      .eq("department_id", mcaDept.id)
      .limit(1)
      .maybeSingle();

    if (!dbmsSub) {
      const { data: newSub, error: subErr } = await supabaseAdmin
        .from("subjects")
        .insert({
          name: "Database Management Systems",
          code: "MCA-DBMS",
          department_id: mcaDept.id,
        })
        .select()
        .single();
      if (subErr) console.error("Subject creation error:", subErr);
      dbmsSub = newSub;
    }

    // 4. Get or Create Main Exam
    let { data: exam } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("subject_id", dbmsSub.id)
      .eq("type", "main")
      .maybeSingle();

    if (!exam) {
      const { data: newExam, error: examErr } = await supabaseAdmin
        .from("exams")
        .insert({
          subject_id: dbmsSub.id,
          type: "main",
          title: "MCA 3rd Sem Main Examination - DBMS",
          total_marks: 100,
          status: "published",
        })
        .select()
        .single();
      if (examErr) throw examErr;
      exam = newExam;
    }

    console.log(`Main Exam ID: ${exam.id}`);

    // 5. Insert results for all 87 MCA students
    let passCount = 0;
    let failCount = 0;

    for (let i = 0; i < (students || []).length; i++) {
      const st = students[i];
      let totalMarks;
      // Top 10 rankers get 88.5 - 98.0
      if (i < 10) {
        totalMarks = 98 - i * 0.9;
      } else if (i < 71) {
        totalMarks = 42 + ((i * 11) % 43); // Passed (42 to 85)
      } else {
        totalMarks = 22 + (i % 16); // Failed / Backlog (22 to 37)
      }
      totalMarks = Math.round(totalMarks * 10) / 10;
      const passed = totalMarks >= 40;

      if (passed) passCount++;
      else failCount++;

      await supabaseAdmin.from("main_results").upsert(
        {
          exam_id: exam.id,
          student_id: st.id,
          total_marks: totalMarks,
          max_marks: 100,
          passed,
          published: true,
          published_at: new Date().toISOString(),
        },
        { onConflict: "exam_id,student_id" }
      );
    }

    console.log(`Successfully inserted main_results for ${students.length} MCA students!`);
    console.log(`Summary: Passed = ${passCount}, Failed/Backlog = ${failCount}, Pass % = ${Math.round((passCount / students.length) * 100)}%`);

  } catch (err) {
    console.error("Error populating MCA results:", err);
  }
}

seedMcaResults().then(() => process.exit(0));
