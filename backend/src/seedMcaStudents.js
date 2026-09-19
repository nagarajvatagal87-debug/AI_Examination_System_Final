const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

const MCA_STUDENT_NAMES = [
  "Ameer Nagarasi", "Prajwal Kumar", "Rohan Verma", "Sneha Patil", "Karthik Raja",
  "Divyashree H", "Omkar Hatti", "Ananya Roy", "Vikas Gowda", "Sanjay Kumar",
  "Priya Sharma", "Abhishek N", "Bhumika Rao", "Chetan Bhagat", "Deepika Padukone",
  "Eshwar Prasad", "Farhan Akhtar", "Ganesh Hegde", "Harish Chandra", "Ishita Dutta",
  "Jagadish Shettar", "Kavya Madhavan", "Lokesh Rahul", "Manjunath Swamy", "Nisha Agarwal",
  "Ojasvi Sharma", "Pooja Hegde", "Qasim Ali", "Rakesh Roshan", "Shruti Haasan",
  "Tejaswini Gowda", "Uday Kiran", "Varun Dhawan", "Wasim Akram", "Xavier Pinto",
  "Yash Gowda", "Zoya Akhtar", "Aditya Roy", "Bharath Raj", "Chaithra K",
  "Darshan Thoogudeepa", "Elango Kumar", "Fathima Beevi", "Girish Karnad", "Hema Malini",
  "Indrajith Lankesh", "Jyothika Saravanan", "Kiran Mazumdar", "Lakshmi Rai", "Manoj Bajpayee",
  "Naveen Polishetty", "Omprakash Rao", "Pavithra L", "Qadir Pasha", "Radhika Pandit",
  "Shivaraj Kumar", "Trisha Krishnan", "Upendra Rao", "Vijay Sethupathi", "Wilfred Dsouza",
  "Yogesh Kumar", "Zubeen Garg", "Akshay Kumar", "Bindu Madhavi", "Chandan Shetty",
  "Dhananjaya K", "Ekta Kapoor", "Francis Xavier", "Gautham Menon", "Hariharan S",
  "Irfan Khan", "Javagal Srinath", "Kavitha Raj", "Latha Mangeshkar", "Madhu Bangarappa",
  "Niveditha Gowda", "Om Puri", "Prashanth Neel", "Qureshi Ahmed", "Rashmika Mandanna",
  "Sudeep Sanjeev", "Tara Anuradha", "Umasree K", "Venkatesh Prasad", "Vidyut Jammwal",
  "Yashaswini Singh", "Zeenat Aman"
];

async function seedMca87Students() {
  console.log("=== SEEDING MCA 87 STUDENTS & EXAM DATA ===");

  try {
    // 1. Get or Create MCA Department
    let { data: mcaDept } = await supabaseAdmin
      .from("departments")
      .select("*")
      .ilike("name", "%computer applications%")
      .maybeSingle();

    if (!mcaDept) {
      let { data: mcaDeptByName } = await supabaseAdmin
        .from("departments")
        .select("*")
        .ilike("name", "%mca%")
        .maybeSingle();
      mcaDept = mcaDeptByName;
    }

    if (!mcaDept) {
      const { data: newDept, error: deptErr } = await supabaseAdmin
        .from("departments")
        .insert({ name: "Computer Applications (MCA)" })
        .select()
        .single();
      if (deptErr) throw deptErr;
      mcaDept = newDept;
    }

    console.log(`MCA Department ID: ${mcaDept.id} (${mcaDept.name})`);

    // 2. Assign HOD if not assigned
    let { data: hod } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "hod")
      .eq("department_id", mcaDept.id)
      .maybeSingle();

    if (!hod) {
      // Find any HOD or update existing
      let { data: anyHod } = await supabaseAdmin.from("profiles").select("*").eq("role", "hod").limit(1).maybeSingle();
      if (anyHod) {
        await supabaseAdmin.from("profiles").update({ department_id: mcaDept.id }).eq("id", anyHod.id);
        await supabaseAdmin.from("departments").update({ hod_id: anyHod.id }).eq("id", mcaDept.id);
        console.log(`Assigned HOD ${anyHod.full_name} (${anyHod.id}) to MCA Department`);
      }
    } else {
      await supabaseAdmin.from("departments").update({ hod_id: hod.id }).eq("id", mcaDept.id);
    }

    // 3. Create or Update 87 MCA Students
    console.log(`Seeding 87 MCA Student Profiles...`);
    const studentIds = [];

    for (let i = 0; i < 87; i++) {
      const regNo = `1DS23MCA${String(i + 1).padStart(3, "0")}`;
      const name = MCA_STUDENT_NAMES[i] || `MCA Student ${i + 1}`;
      const email = `mca_student_${i + 1}@dsatm.edu.in`;
      const semester = i < 45 ? "3rd Sem" : "1st Sem";

      let { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("registration_no", regNo)
        .maybeSingle();

      if (!existing) {
        // Try creating auth user or inserting dummy UUID profile directly
        try {
          const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: "Password123!",
            email_confirm: true,
          });

          if (authUser?.user) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .insert({
                id: authUser.user.id,
                role: "student",
                full_name: name,
                registration_no: regNo,
                email,
                department_id: mcaDept.id,
                semester,
              })
              .select()
              .single();
            if (profile) studentIds.push(profile.id);
          }
        } catch (e) {
          console.warn(`Auth user creation fallback for ${regNo}:`, e.message);
        }
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({ department_id: mcaDept.id, semester, full_name: name })
          .eq("id", existing.id);
        studentIds.push(existing.id);
      }
    }

    console.log(`Total active profiles linked to MCA: ${studentIds.length}`);

    // Fetch all current MCA profiles
    const { data: allMcaStudents } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no")
      .eq("role", "student")
      .eq("department_id", mcaDept.id);

    console.log(`DB Count of MCA Students: ${allMcaStudents?.length || 0}`);

    // 4. Create MCA Subjects & Main Exam
    let { data: dbmsSub } = await supabaseAdmin
      .from("subjects")
      .select("*")
      .eq("code", "MCA-DBMS")
      .maybeSingle();

    if (!dbmsSub) {
      const { data: newSub } = await supabaseAdmin
        .from("subjects")
        .insert({
          name: "Database Management Systems",
          code: "MCA-DBMS",
          department_id: mcaDept.id,
          semester: "3rd Sem",
        })
        .select()
        .single();
      dbmsSub = newSub;
    }

    let { data: javaSub } = await supabaseAdmin
      .from("subjects")
      .select("*")
      .eq("code", "MCA-JAVA")
      .maybeSingle();

    if (!javaSub) {
      const { data: newSub } = await supabaseAdmin
        .from("subjects")
        .insert({
          name: "Java Enterprise Programming",
          code: "MCA-JAVA",
          department_id: mcaDept.id,
          semester: "3rd Sem",
        })
        .select()
        .single();
      javaSub = newSub;
    }

    console.log("MCA Subjects seeded: DBMS & Java Enterprise");

    // 5. Create Main Exam for DBMS
    let { data: dbmsExam } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("title", "MCA 3rd Sem Main Examination - DBMS")
      .maybeSingle();

    if (!dbmsExam && dbmsSub) {
      const { data: newExam } = await supabaseAdmin
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
      dbmsExam = newExam;
    }

    console.log(`DBMS Main Exam ID: ${dbmsExam?.id}`);

    // 6. Populate main_results for all MCA students for DBMS
    if (dbmsExam && allMcaStudents?.length > 0) {
      console.log(`Generating Main Exam Results for ${allMcaStudents.length} MCA Students...`);
      for (let i = 0; i < allMcaStudents.length; i++) {
        const student = allMcaStudents[i];
        // Calculate realistic score: Top rankers get 85-98, average get 60-84, ~10% get 25-38 (backlog)
        let totalMarks;
        if (i < 10) {
          totalMarks = 95 - i * 1.2; // Top 10
        } else if (i < 72) {
          totalMarks = 50 + ((i * 7) % 35); // Pass
        } else {
          totalMarks = 25 + (i % 12); // Fail / Backlog
        }
        totalMarks = Math.round(totalMarks * 10) / 10;
        const passed = totalMarks >= 40;

        await supabaseAdmin.from("main_results").upsert(
          {
            exam_id: dbmsExam.id,
            student_id: student.id,
            total_marks: totalMarks,
            max_marks: 100,
            passed,
            published: true,
            published_at: new Date().toISOString(),
          },
          { onConflict: "exam_id,student_id" }
        );
      }
      console.log("Main results successfully populated!");
    }

    console.log("=== MCA SEEDING COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Error seeding MCA students:", err);
  }
}

seedMca87Students().then(() => process.exit(0));
