const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const crypto = require("crypto");
const { supabaseAdmin } = require("../config/Supabase");
const { enrollMultipleStudents, getEnrolledStudentIds } = require("./services/enrollmentStore");
const { getSubjectAttendance } = require("./services/academicStore");
const { getSubjectInternalMarks } = require("./services/internalMarksStore");

const DEVOPS_STUDENT_LIST = [
  { sno: 1, usn: "1DT25MC004", name: "Akshay N" },
  { sno: 2, usn: "1DT25MC005", name: "Ameer Annasab Nagarasi" },
  { sno: 3, usn: "1DT25MC007", name: "Ankita" },
  { sno: 4, usn: "1DT25MC008", name: "Anusha Shivananda Naik" },
  { sno: 5, usn: "1DT25MC010", name: "Bhavani Danayya Masaguppimath" },
  { sno: 6, usn: "1DT25MC011", name: "Bhavya V" },
  { sno: 7, usn: "1DT25MC013", name: "Dhruv Dave" },
  { sno: 8, usn: "1DT25MC014", name: "Dhanashree Vinayak Naik" },
  { sno: 9, usn: "1DT25MC015", name: "Dhanya S" },
  { sno: 10, usn: "1DT25MC017", name: "Gamati Vamsi Krishna" },
  { sno: 11, usn: "1DT25MC019", name: "Gowtham H J" },
  { sno: 12, usn: "1DT25MC021", name: "Harshitha K M" },
  { sno: 13, usn: "1DT25MC023", name: "Indra R" },
  { sno: 14, usn: "1DT25MC026", name: "Kushal J Bhandari" },
  { sno: 15, usn: "1DT25MC027", name: "Manjesh S" },
  { sno: 16, usn: "1DT25MC030", name: "Mohammed Abuzar" },
  { sno: 17, usn: "1DT25MC032", name: "Mohith Raj M" },
  { sno: 18, usn: "1DT25MC033", name: "Mounashree M R" },
  { sno: 19, usn: "1DT25MC034", name: "Muktha Giri" },
  { sno: 20, usn: "1DT25MC036", name: "Nagaraj" },
  { sno: 21, usn: "1DT25MC038", name: "Nethra S" },
  { sno: 22, usn: "1DT25MC039", name: "Nidhi Kiran Ankolekar" },
  { sno: 23, usn: "1DT25MC040", name: "Nihar Sujan Shetty" },
  { sno: 24, usn: "1DT25MC041", name: "Podapati Siva Hari Naidu" },
  { sno: 25, usn: "1DT25MC043", name: "Praveen Kumar V" },
  { sno: 26, usn: "1DT25MC044", name: "Praveen Subash Koppad" },
  { sno: 27, usn: "1DT25MC046", name: "Puchapotula Teja Bharadwaz" },
  { sno: 28, usn: "1DT25MC047", name: "Punith K P" },
  { sno: 29, usn: "1DT25MC048", name: "Rakshita Umesh Naik" },
  { sno: 30, usn: "1DT25MC049", name: "Reeha Anjum" },
  { sno: 31, usn: "1DT25MC050", name: "Rekha K" },
  { sno: 32, usn: "1DT25MC051", name: "Rohit Dattaraya Gokarnkar" },
  { sno: 33, usn: "1DT25MC052", name: "Rohith S" },
  { sno: 34, usn: "1DT25MC053", name: "Sai Nithin" },
  { sno: 35, usn: "1DT25MC056", name: "Satish" },
  { sno: 36, usn: "1DT25MC058", name: "Shankara Gouda" },
  { sno: 37, usn: "1DT25MC059", name: "Shashank Bharadwaj S" },
  { sno: 38, usn: "1DT25MC061", name: "Shubhadip Ganguly" },
  { sno: 39, usn: "1DT25MC062", name: "Sinchana M S" },
  { sno: 40, usn: "1DT25MC063", name: "Sudeep Raj D" },
  { sno: 41, usn: "1DT25MC064", name: "Sumukha G" },
  { sno: 42, usn: "1DT25MC066", name: "Unnathi U Hiriyur" },
  { sno: 43, usn: "1DT25MC067", name: "Valipreddy Sujin Kumar Reddy" },
  { sno: 44, usn: "1DT25MC068", name: "Varun K" },
  { sno: 45, usn: "1DT25MC070", name: "Venugopal K" },
  { sno: 46, usn: "1DT25MC071", name: "Vidya Ashok Halakeri" },
  { sno: 47, usn: "1DT25MC072", name: "Vidyasagar S" },
  { sno: 48, usn: "1DT25MC073", name: "Vinod Kumar H M" },
  { sno: 49, usn: "1DT25MC074", name: "Vinyas Kumar" },
  { sno: 50, usn: "1DT25MC075", name: "Vishnu Prasad G" },
  { sno: 51, usn: "1DT25MC054", name: "Sangeetha P" },
  { sno: 52, usn: "1DT25MC024", name: "Indupriya G" },
  { sno: 53, usn: "1DT25MC035", name: "N Sujal" },
  { sno: 54, usn: "1DT25MC037", name: "Nagesh Gowda K R" },
  { sno: 55, usn: "1DT25MC057", name: "Shaik Abdul Malik Rehan" }
];

async function seedDevopsEnrolledStudents() {
  console.log("=== ENROLLING 55 STUDENTS FOR DEVOPS (MMC335) ===");

  // 1. Get MCA Department
  let { data: mcaDept } = await supabaseAdmin
    .from("departments")
    .select("*")
    .ilike("name", "%computer applications%")
    .maybeSingle();

  if (!mcaDept) {
    let { data: fallbackDept } = await supabaseAdmin.from("departments").select("*").limit(1).maybeSingle();
    mcaDept = fallbackDept;
  }

  const deptId = mcaDept ? mcaDept.id : "37909cba-a75d-428e-9181-fddf9920fb0b";
  console.log(`Using Department ID: ${deptId}`);

  // 2. Get Faculty Ushashree
  let { data: ushashree } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .ilike("full_name", "%ushashree%")
    .eq("role", "faculty")
    .maybeSingle();

  if (!ushashree) {
    console.log("Creating Faculty profile for Ushashree...");
    const email = "ushashree-mca@dsatm.edu.in";
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: "Password123!",
        email_confirm: true,
      });
      const userId = authUser?.user?.id || crypto.randomUUID();
      const { data: newProf } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          full_name: "Ushashree",
          email,
          role: "faculty",
          department_id: deptId,
        })
        .select()
        .single();
      ushashree = newProf;
    } catch (e) {
      console.warn("Faculty user creation fallback:", e.message);
    }
  }

  console.log(`Faculty Ushashree ID: ${ushashree?.id} (${ushashree?.full_name})`);

  // 3. Get or Create DevOps subject (MMC335 / Devops)
  let { data: devopsSubject } = await supabaseAdmin
    .from("subjects")
    .select("*")
    .or("code.eq.MMC335,name.ilike.%devops%")
    .maybeSingle();

  if (!devopsSubject) {
    console.log("Creating Devops subject...");
    const { data: newSub, error: subErr } = await supabaseAdmin
      .from("subjects")
      .insert({
        name: "Devops",
        code: "MMC335",
        department_id: deptId,
        faculty_id: ushashree.id,
      })
      .select()
      .single();

    if (subErr) throw subErr;
    devopsSubject = newSub;
  } else if (devopsSubject.faculty_id !== ushashree.id) {
    console.log(`Updating faculty_id for DevOps subject ${devopsSubject.id} to Ushashree...`);
    await supabaseAdmin
      .from("subjects")
      .update({ faculty_id: ushashree.id, code: "MMC335" })
      .eq("id", devopsSubject.id);
  }

  console.log(`Devops Subject ID: ${devopsSubject.id} (${devopsSubject.name} - ${devopsSubject.code})`);

  // 4. Ensure all 55 student profiles exist in Supabase
  const studentIds = [];

  for (const st of DEVOPS_STUDENT_LIST) {
    const regNo = st.usn.trim();
    const name = st.name.trim();
    const email = `${regNo.toLowerCase()}@dsatm.edu.in`;

    let { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("registration_no", regNo)
      .maybeSingle();

    if (!existing) {
      // Try creating via Auth Admin first
      let studentId = null;
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "Password123!",
          email_confirm: true,
        });

        if (authUser?.user) {
          studentId = authUser.user.id;
        }
      } catch (authErr) {
        console.warn(`Auth user creation failed for ${regNo}:`, authErr.message);
      }

      if (!studentId) {
        studentId = crypto.randomUUID();
      }

      const { data: profile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: studentId,
          role: "student",
          full_name: name,
          registration_no: regNo,
          email,
          department_id: deptId,
          semester: "3rd Sem",
        })
        .select()
        .single();

      if (profErr) {
        console.error(`Error inserting profile for ${regNo}:`, profErr.message);
      } else if (profile) {
        studentIds.push(profile.id);
        console.log(`Created profile: ${regNo} - ${name} (${profile.id})`);
      }
    } else {
      // Update existing profile name & department to match image list
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: name,
          department_id: deptId,
          semester: "3rd Sem",
          role: "student"
        })
        .eq("id", existing.id);

      studentIds.push(existing.id);
      console.log(`Updated profile: ${regNo} - ${name} (${existing.id})`);
    }
  }

  console.log(`Total 55 Student Profiles Processed: ${studentIds.length}`);

  // 5. Save enrollments to persistent_enrollments.json
  enrollMultipleStudents(devopsSubject.id, studentIds);
  console.log(`Enrolled ${studentIds.length} students into DevOps subject ${devopsSubject.id}`);

  // 6. Verify enrollment & getters
  const enrolledFromStore = getEnrolledStudentIds(devopsSubject.id);
  console.log(`Verification: getEnrolledStudentIds count = ${enrolledFromStore.length}`);

  const attendanceRoster = await getSubjectAttendance(devopsSubject.id);
  console.log(`Verification: getSubjectAttendance roster count = ${attendanceRoster.length}`);

  const internalMarksRoster = await getSubjectInternalMarks(devopsSubject.id);
  console.log(`Verification: getSubjectInternalMarks roster count = ${internalMarksRoster.length}`);

  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
}

seedDevopsEnrolledStudents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error in seeding:", err);
    process.exit(1);
  });
