const { supabaseAdmin } = require("../../config/Supabase");
const { getHodAttendanceOverview } = require("./academicStore");
const { getSubjectInternalMarks } = require("./internalMarksStore");
const { getEnrolledStudentIds } = require("./enrollmentStore");

/**
 * Generate academic reports strictly querying real database tables and persistent stores.
 * Never generates fake 0 marks or demo rows if no data exists.
 */
async function generateAcademicReport({ reportType, departmentId, subjectId, semester, examId, format = "csv" }) {
  let rows = [];
  let title = "Academic Report";

  if (reportType === "student_roster") {
    title = "Department Student Roster Report";
    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, registration_no, semester, section, email, created_at")
      .eq("role", "student")
      .order("registration_no");

    if (departmentId) query = query.eq("department_id", departmentId);
    if (semester && semester !== "ALL") query = query.eq("semester", semester);

    const { data } = await query;
    rows = (data || []).map((s) => ({
      "Registration No (USN)": s.registration_no || "N/A",
      "Student Name": s.full_name,
      "Semester": s.semester || "3rd Sem",
      "Section": s.section || "A",
      "Email Address": s.email,
    }));
  } else if (reportType === "internal_assessment") {
    title = "Internal Assessment 50-Mark Report";
    if (subjectId) {
      const marksList = await getSubjectInternalMarks(subjectId);
      rows = (marksList || []).map((m) => ({
        "Registration No": m.profiles?.registration_no || "N/A",
        "Student Name": m.profiles?.full_name || "Student",
        "Internal 1 (15M)": m.internal1_marks,
        "Internal 2 (15M)": m.internal2_marks,
        "Internal 3 (10M)": m.internal3_marks,
        "Assignment (10M)": m.assignment_marks,
        "Total (50M)": m.total_internal_marks,
        "Eligibility Status": m.is_eligible ? "ELIGIBLE (>=25)" : "DETAINED (<25)",
        "Approval Status": m.status,
      }));
    }
  } else if (reportType === "attendance") {
    title = "Department Attendance Report";
    const attData = await getHodAttendanceOverview(departmentId);
    const students = attData?.students || [];

    rows = students
      .filter((st) => !semester || semester === "ALL" || st.semester === semester)
      .map((st) => ({
        "Registration No": st.registrationNo,
        "Student Name": st.studentName,
        "Semester": st.semester || "3rd Sem",
        "Attendance %": st.hasAttendance ? `${st.overallPercentage}%` : "Pending Upload",
        "Eligibility": st.hasAttendance ? (st.isEligible ? "ELIGIBLE" : "BARRED (<75%)") : "ATTENDANCE PENDING",
      }));
  } else if (reportType === "faculty_workload") {
    title = "Faculty Workload & Subject Assignment Report";
    const { data: faculty } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "faculty")
      .eq("department_id", departmentId);

    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, code, semester, faculty_id")
      .eq("department_id", departmentId);

    const subList = subjects || [];

    rows = (faculty || []).map((f) => {
      const assigned = subList.filter((s) => s.faculty_id === f.id);
      return {
        "Faculty Name": f.full_name,
        "Email": f.email,
        "Assigned Subjects": assigned.map((s) => `${s.name} (${s.code})`).join("; ") || "None",
        "Subject Count": assigned.length,
      };
    });
  } else if (reportType === "top_students") {
    title = "Top 10 Merit Students Report";
    const { data: subjects } = await supabaseAdmin.from("subjects").select("id").eq("department_id", departmentId);
    const subjectIds = (subjects || []).map((s) => s.id);

    if (subjectIds.length > 0) {
      const { data: mainExams } = await supabaseAdmin.from("exams").select("id").eq("type", "main").in("subject_id", subjectIds);
      const examIds = (mainExams || []).map((e) => e.id);

      if (examIds.length > 0) {
        const { data: results } = await supabaseAdmin
          .from("main_results")
          .select("student_id, total_marks, max_marks, profiles(full_name, registration_no, semester)")
          .in("exam_id", examIds);

        const byStudent = {};
        (results || []).forEach((r) => {
          if (!byStudent[r.student_id]) {
            byStudent[r.student_id] = {
              name: r.profiles?.full_name,
              regNo: r.profiles?.registration_no,
              semester: r.profiles?.semester,
              totalMarks: 0,
              maxMarks: 0,
            };
          }
          byStudent[r.student_id].totalMarks += r.total_marks;
          byStudent[r.student_id].maxMarks += r.max_marks;
        });

        rows = Object.values(byStudent)
          .map((s) => ({
            ...s,
            percentage: s.maxMarks ? Math.round((s.totalMarks / s.maxMarks) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 10)
          .map((s, idx) => ({
            "Rank": `#${idx + 1}`,
            "Registration No": s.regNo,
            "Student Name": s.name,
            "Semester": s.semester,
            "Percentage": `${s.percentage}%`,
          }));
      }
    }
  }

  return {
    title,
    reportType,
    generatedAt: new Date().toISOString(),
    totalRecords: rows.length,
    rows,
  };
}

module.exports = {
  generateAcademicReport,
};
