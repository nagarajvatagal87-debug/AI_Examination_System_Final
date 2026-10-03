const fs = require("fs");
const path = require("path");
const { supabaseAdmin } = require("../../config/Supabase");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const CALENDAR_FILE = path.join(DATA_DIR, "persistent_academic_calendar.json");
const HISTORY_FILE = path.join(DATA_DIR, "persistent_calendar_history.json");
const NOTIF_LOG_FILE = path.join(DATA_DIR, "persistent_calendar_notif_logs.json");

let memoryCalendarEvents = [];
let memoryCalendarHistory = [];
let memoryNotifLogs = [];

// Load persistent calendar data
try {
  if (fs.existsSync(CALENDAR_FILE)) {
    const raw = fs.readFileSync(CALENDAR_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryCalendarEvents = parsed;
  }
} catch (e) {
  console.warn("Failed to load academic calendar file:", e.message);
}

try {
  if (fs.existsSync(HISTORY_FILE)) {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryCalendarHistory = parsed;
  }
} catch (e) {}

try {
  if (fs.existsSync(NOTIF_LOG_FILE)) {
    const raw = fs.readFileSync(NOTIF_LOG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryNotifLogs = parsed;
  }
} catch (e) {}

function saveCalendarToDisk() {
  try {
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(memoryCalendarEvents, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save academic calendar to disk:", e.message);
  }
}

function saveHistoryToDisk() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(memoryCalendarHistory, null, 2), "utf8");
  } catch (e) {}
}

function saveNotifLogsToDisk() {
  try {
    fs.writeFileSync(NOTIF_LOG_FILE, JSON.stringify(memoryNotifLogs, null, 2), "utf8");
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// OFFICIAL MCA III SEMESTER ACADEMIC CALENDAR SEED DATA (AUG 2026 - DEC 2026)
// ---------------------------------------------------------------------------
const OFFICIAL_MCA_SEED_EVENTS = [
  {
    id: "mca-cal-001",
    title: "Commencement of Odd Semester",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-08-24",
    end_date: "2026-12-12",
    start_time: "09:00 AM",
    end_time: "04:30 PM",
    description: "Official commencement of III Semester MCA Academic Session (August 2026 to December 2026).",
    remarks: "Regular classes begin for all registered students.",
    location: "MCA Department, DSATM",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-002",
    title: "Registration of Odd Semester",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-08-24",
    end_date: "2026-08-25",
    description: "Course & Semester Registration for III Semester MCA Students.",
    remarks: "Mandatory for all III Semester students.",
    location: "MCA Dept / LMS Portal",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-003",
    title: "5th Saturday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-08-29",
    end_date: "2026-08-29",
    description: "General Holiday - 5th Saturday.",
    remarks: "No regular academic activities scheduled.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal", "exam_dept"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-004",
    title: "Proctor Meeting-1",
    event_type: "MEETING",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-08-31",
    end_date: "2026-08-31",
    description: "First Proctoring & Mentoring Meeting for III Semester MCA Students.",
    remarks: "Proctors to review attendance and student onboarding.",
    location: "Proctor Classrooms",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-005",
    title: "Saturday / Holiday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-05",
    end_date: "2026-09-05",
    description: "General Holiday - Saturday.",
    remarks: "Institutional Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-006",
    title: "Identification of Slow Learners",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-10",
    end_date: "2026-09-12",
    description: "Assessment & Identification of Slow Learners for Remedial Coaching.",
    remarks: "Faculty members to evaluate student performance baseline.",
    location: "MCA Department",
    audience: ["faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-007",
    title: "Ganesha Chaturthi",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-14",
    end_date: "2026-09-14",
    description: "General Holiday - Ganesha Chaturthi Festival.",
    remarks: "No regular academic activities scheduled.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-008",
    title: "Submission of First Internal Question Papers by Faculties to HOD",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-19",
    end_date: "2026-09-19",
    description: "Deadline for subject faculty to submit CIE-1 Question Papers with scheme to HOD.",
    remarks: "Requires Scheme of Evaluation & Bloom's taxonomy mapping.",
    location: "HOD Office / LMS Exam Portal",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-009",
    title: "1st & 3rd Saturday Holiday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-19",
    end_date: "2026-09-19",
    description: "General Holiday - 3rd Saturday.",
    remarks: "Institutional Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-010",
    title: "Project Review-1",
    event_type: "PROJECT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-29",
    end_date: "2026-09-29",
    description: "First Review of MCA III Semester Major Project / Mini Project Progress.",
    remarks: "Students must present Problem Statement, SRS, and System Architecture.",
    location: "Seminar Hall / Project Labs",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-011",
    title: "Remedial Classes for Slow Learners",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-29",
    end_date: "2026-10-05",
    description: "Remedial & Support Classes for identified slow learners before CIE-1.",
    remarks: "Subject faculty to conduct problem-solving sessions.",
    location: "MCA Department Classrooms",
    audience: ["students", "faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-012",
    title: "Ethical Hacking & Cyber Defense: A Hands-On Workshop in VAPT and Web Security",
    event_type: "WORKSHOP",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-09-30",
    end_date: "2026-09-30",
    description: "Technical Workshop on Vulnerability Assessment, Penetration Testing & Cyber Defense.",
    remarks: "Hands-on lab session with industry cybersecurity experts.",
    location: "MCA Computer Lab 2",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-013",
    title: "Gandhi Jayanti",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-02",
    end_date: "2026-10-02",
    description: "General Holiday - Mahatma Gandhi Jayanti.",
    remarks: "No regular academic activities scheduled. National Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-014",
    title: "Saturday / Holiday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-03",
    end_date: "2026-10-03",
    description: "General Holiday - Saturday following Gandhi Jayanti.",
    remarks: "Institutional Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-015",
    title: "Faculty Appraisal by Students (Round-1)",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-05",
    end_date: "2026-10-07",
    description: "Student Feedback & Faculty Performance Appraisal Round-1 on LMS Portal.",
    remarks: "All III Semester MCA students to complete course-wise evaluation.",
    location: "LMS Portal / Computer Labs",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-016",
    title: "Mahalaya Amavasya",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-10",
    end_date: "2026-10-10",
    description: "General Holiday - Mahalaya Amavasya.",
    remarks: "Institutional General Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-017",
    title: "Workshop on DevOps in Action: From Code to Continuous Deployment",
    event_type: "WORKSHOP",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-14",
    end_date: "2026-10-14",
    description: "Hands-on Workshop covering Docker, Kubernetes, CI/CD Pipelines & Cloud Deployment.",
    remarks: "Invited speaker from Tier-1 IT Industry.",
    location: "Auditorium / MCA Lab 1",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-018",
    title: "Saturday / Holiday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-17",
    end_date: "2026-10-17",
    description: "General Holiday - 3rd Saturday.",
    remarks: "Institutional Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-019",
    title: "Ayudha Pooja",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-20",
    end_date: "2026-10-20",
    description: "General Holiday - Ayudha Pooja Festival.",
    remarks: "General Holiday across institution.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-020",
    title: "Vijayadashami",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-21",
    end_date: "2026-10-21",
    description: "General Holiday - Vijayadashami Festival.",
    remarks: "General Holiday across institution.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-021",
    title: "Review of Question Papers by Program Assessment Committee",
    event_type: "AUDIT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-21",
    end_date: "2026-10-21",
    description: "PAC Review & Quality Audit of CIE-1 Question Papers against CO-PO mappings.",
    remarks: "PAC Committee Members & HOD Verification.",
    location: "HOD Conference Room",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-022",
    title: "Submission of Final Approved Question Papers for Printing",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-22",
    end_date: "2026-10-22",
    description: "Final PAC approved question papers submitted to Exam Control Cell for CIE-1 printing.",
    remarks: "Confidential submission to Exam Control Officer.",
    location: "Exam Control Room",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-023",
    title: "Idea Pitch Presentation on Deep Learning and Generative AI",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-24",
    end_date: "2026-10-24",
    description: "Student Innovation & AI Project Pitching Session judged by Industry Experts.",
    remarks: "Certificates & cash prizes for winning teams.",
    location: "DSATM Main Auditorium",
    audience: ["students", "faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-024",
    title: "Valmiki Jayanti",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-26",
    end_date: "2026-10-26",
    description: "General Holiday - Maharshi Valmiki Jayanti.",
    remarks: "State / Institutional General Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-025",
    title: "Internal Assessment-1 (CIE-1)",
    event_type: "INTERNAL_ASSESSMENT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-27",
    end_date: "2026-10-28",
    start_time: "09:30 AM",
    end_time: "01:00 PM",
    description: "First Continuous Internal Evaluation (CIE-1) Examinations for III Semester MCA.",
    remarks: "Mandatory attendance. Seating arrangement published on notice board.",
    location: "MCA Exam Halls",
    audience: ["students", "faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-026",
    title: "Software Testing in the Real World: From Manual Testing to AI Powered QA",
    event_type: "WORKSHOP",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-27",
    end_date: "2026-10-27",
    description: "Technical Seminar & Live Demo on Selenium, Playwright & AI Test Automation.",
    remarks: "Special evening session for MCA students.",
    location: "MCA Seminar Hall",
    audience: ["students", "faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-027",
    title: "Proctor Meeting-2",
    event_type: "MEETING",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-30",
    end_date: "2026-10-30",
    description: "Second Proctoring Session to review CIE-1 performance and attendance status.",
    remarks: "Proctors to counsel low-performing students.",
    location: "Proctor Classrooms",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-028",
    title: "Saturday / Holiday",
    event_type: "GENERAL_HOLIDAY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-10-31",
    end_date: "2026-10-31",
    description: "General Holiday - 5th Saturday.",
    remarks: "Institutional Holiday.",
    location: "College-wide",
    audience: ["students", "faculty", "hod"],
    priority: "NORMAL",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-029",
    title: "Workshop on MERNSTACK Web Development",
    event_type: "WORKSHOP",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-02",
    end_date: "2026-11-02",
    description: "Full-day Skill Enhancement Workshop on MongoDB, Express, React, and Node.js.",
    remarks: "Hands-on project building session.",
    location: "MCA Computer Lab 3",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-030",
    title: "Faculty Appraisal by Students (Round-2)",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-02",
    end_date: "2026-11-04",
    description: "Mid-semester Student Feedback & Faculty Appraisal Round-2.",
    remarks: "Online submission via student dashboard.",
    location: "LMS Portal",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-031",
    title: "Review of Students Performance, Display and Dispatch of Progress Report (CIE-1 Performance)",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-03",
    end_date: "2026-11-05",
    description: "Display of CIE-1 marks, progress report generation, and dispatch to parents.",
    remarks: "Faculty to enter marks in LMS portal.",
    location: "Department Notice Board / LMS",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-032",
    title: "Antaragni 2026",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-05",
    end_date: "2026-11-05",
    description: "Annual Departmental Technical & Cultural Fest - Antaragni 2026.",
    remarks: "Coding competitions, hackathons, and cultural events.",
    location: "DSATM Open Air Theatre / Labs",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-033",
    title: "Buildathon 2026",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-06",
    end_date: "2026-11-06",
    description: "24-Hour Continuous Software Development & Prototyping Buildathon.",
    remarks: "Cash rewards and incubator opportunities.",
    location: "Innovation & Incubation Centre",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-034",
    title: "Submission of Second Internal Question Papers by Faculties to HOD",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-12",
    end_date: "2026-11-12",
    description: "Deadline for subject faculty to submit CIE-2 Question Papers to HOD.",
    remarks: "Includes Scheme of Evaluation for CIE-2.",
    location: "HOD Office / LMS Exam Portal",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-035",
    title: "Project Review-2",
    event_type: "PROJECT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-12",
    end_date: "2026-11-12",
    description: "Second Review of Major Project Progress - Working Prototype & Database Schema.",
    remarks: "Demonstration of 60% completion.",
    location: "MCA Project Labs",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-036",
    title: "Industrial Visit",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-14",
    end_date: "2026-11-14",
    description: "Industrial Exposure Visit for MCA III Semester Students to IT Tech Park.",
    remarks: "Bus transport arranged from campus.",
    location: "IT Tech Park, Whitefield",
    audience: ["students", "faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-037",
    title: "Submission of Final Approved Question Papers for Printing",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-16",
    end_date: "2026-11-16",
    description: "Final PAC verified CIE-2 Question Papers submitted for confidential printing.",
    remarks: "Exam Control Cell handover.",
    location: "Exam Control Room",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-038",
    title: "Outreach Programme",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-17",
    end_date: "2026-11-17",
    description: "Social Responsibility & Digital Literacy Outreach Programme by MCA Students.",
    remarks: "Community engagement activity.",
    location: "Government School, Kanakapura Road",
    audience: ["students", "faculty", "hod"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-039",
    title: "Academic Audit",
    event_type: "AUDIT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-19",
    end_date: "2026-11-19",
    description: "Internal & External Academic Audit for MCA Department Quality Assurance.",
    remarks: "Review of course files, IA books, and lab manuals.",
    location: "MCA Department Office",
    audience: ["faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-040",
    title: "Celebration of Kannada Rajyotsava",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-26",
    end_date: "2026-11-26",
    description: "State Heritage Celebration - Kannada Rajyotsava 2026.",
    remarks: "Cultural programs and flag hoisting.",
    location: "DSATM Main Stage",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-041",
    title: "Internal Assessment-2 (CIE-2)",
    event_type: "INTERNAL_ASSESSMENT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-28",
    end_date: "2026-11-30",
    start_time: "09:30 AM",
    end_time: "01:00 PM",
    description: "Second Continuous Internal Evaluation (CIE-2) Examinations.",
    remarks: "Compulsory examination for III Semester MCA.",
    location: "MCA Exam Halls",
    audience: ["students", "faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-042",
    title: "IT Leadership Award",
    event_type: "STUDENT_ACTIVITY",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-28",
    end_date: "2026-11-28",
    description: "Annual Departmental Student Leadership & Academic Excellence Award Ceremony.",
    remarks: "Felicitation of top rankers.",
    location: "DSATM Auditorium",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "MEDIUM",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-043",
    title: "Parent-Teacher Meeting",
    event_type: "PARENT_TEACHER",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-11-28",
    end_date: "2026-11-28",
    description: "Parent-Teacher Interaction Meeting to discuss student academic progress & attendance.",
    remarks: "Parents to meet respective Proctors & HOD.",
    location: "MCA Classrooms & HOD Office",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-044",
    title: "Proctor Meeting-3",
    event_type: "MEETING",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-01",
    end_date: "2026-12-01",
    description: "Final Pre-Exam Proctor Meeting to review shortage of attendance & CIE marks eligibility.",
    remarks: "Attendance condonation list review.",
    location: "Proctor Classrooms",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-045",
    title: "BOE Meeting",
    event_type: "MEETING",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-04",
    end_date: "2026-12-04",
    description: "Board of Examinations (BOE) Meeting for Semester End Examination question paper approval.",
    remarks: "BOE Members & External Subject Experts.",
    location: "Board Room, DSATM",
    audience: ["faculty", "hod", "exam_dept", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-046",
    title: "Review of Students Performance, Display and Dispatch of Progress Report (CIE-2 Performance)",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-07",
    end_date: "2026-12-07",
    description: "Final publication & display of CIE-2 marks and consolidated internal assessment performance.",
    remarks: "Dispatched to registered parents.",
    location: "Department Notice Board / LMS",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-047",
    title: "Final Review of Students Performance Display",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-09",
    end_date: "2026-12-09",
    description: "Final verification display of Internal Assessment marks prior to freezing.",
    remarks: "Students must report any discrepancies to HOD before 5 PM.",
    location: "MCA Department Notice Board",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-048",
    title: "Project Exhibition",
    event_type: "PROJECT",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-10",
    end_date: "2026-12-10",
    description: "Annual MCA Major Project Exhibition & Live Product Demonstration.",
    remarks: "External evaluators & industry judges.",
    location: "MCA Project Labs & Foyer",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-049",
    title: "Course End Survey",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-11",
    end_date: "2026-12-11",
    description: "Mandatory Course Outcome (CO) & Program Outcome (PO) Feedback Survey.",
    remarks: "Online submission on LMS.",
    location: "LMS Portal",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-050",
    title: "Last Working Day of Odd Semester",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-12",
    end_date: "2026-12-12",
    description: "Official Last Working Day of Odd Semester for III Semester MCA Program.",
    remarks: "End of formal classroom instruction.",
    location: "MCA Department",
    audience: ["students", "faculty", "hod", "principal", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-051",
    title: "Last Date of IA Marks Entry & Attendance Submission",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-12",
    end_date: "2026-12-12",
    description: "Strict deadline for subject faculty to finalize and submit all Internal Assessment marks & attendance in LMS.",
    remarks: "Faculty submission deadline.",
    location: "LMS Marks Portal",
    audience: ["faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-052",
    title: "Parents-Teachers Interaction Meeting",
    event_type: "PARENT_TEACHER",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-12",
    end_date: "2026-12-12",
    description: "Final Parent-Teacher meeting before Semester End Examinations.",
    remarks: "Review of final attendance eligibility.",
    location: "MCA Department",
    audience: ["students", "faculty", "hod"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-053",
    title: "Final Date for HOD Verification & Freezing of IA Marks & Attendance",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-14",
    end_date: "2026-12-14",
    description: "Official HOD Verification & Final Freezing of IA Marks & Attendance for submission to Examination Department.",
    remarks: "After freeze, marks cannot be modified without formal HOD unfreeze approval.",
    location: "HOD Dashboard / Exam Portal",
    audience: ["faculty", "hod", "exam_dept", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-054",
    title: "Hall Ticket Generation, Printing & Distribution to Departments",
    event_type: "DEADLINE",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-16",
    end_date: "2026-12-16",
    description: "Generation, verification, printing and distribution of official Hall Tickets for eligible students by Examination Department.",
    remarks: "Subject to IA marks & attendance clearance.",
    location: "Exam Control Cell & MCA Dept",
    audience: ["students", "faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-055",
    title: "Practical/Viva Examination",
    event_type: "EXAMINATION",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-28",
    end_date: "2026-12-31",
    start_time: "08:30 AM",
    end_time: "04:30 PM",
    description: "VTU / DSATM Semester End Practical & Viva Voce Examinations for III Semester MCA.",
    remarks: "External Examiners appointed by University / Exam Dept.",
    location: "MCA Computer Laboratories",
    audience: ["students", "faculty", "hod", "exam_dept"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-056",
    title: "Semester End Examinations",
    event_type: "EXAMINATION",
    department_id: "MCA",
    program: "MCA",
    semester: "III",
    academic_year: "2026-27",
    start_date: "2026-12-21",
    end_date: "2026-12-31",
    start_time: "09:30 AM",
    end_time: "12:30 PM",
    description: "Official Semester End Theory Examinations (SEE) conducted by Examination Department.",
    remarks: "Hall ticket mandatory for entry into examination hall.",
    location: "DSATM Examination Halls",
    audience: ["students", "faculty", "hod", "exam_dept", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  },
  {
    id: "mca-cal-057",
    title: "Commencement of II Semester",
    event_type: "ACADEMIC",
    department_id: "MCA",
    program: "MCA",
    semester: "II",
    academic_year: "2026-27",
    start_date: "2027-01-16",
    end_date: "2027-01-16",
    description: "Reopening & Commencement of Classes for Even Semester.",
    remarks: "Official commencement of next semester.",
    location: "MCA Department",
    audience: ["students", "faculty", "hod", "principal"],
    priority: "HIGH",
    status: "PUBLISHED",
    created_by: "HOD MCA",
    published_by: "HOD MCA",
    published_at: "2026-08-20T00:00:00.000Z",
    version: 1
  }
];

// Seed initial memory & file storage if empty
function initializeCalendarData() {
  if (memoryCalendarEvents.length === 0) {
    memoryCalendarEvents = [...OFFICIAL_MCA_SEED_EVENTS];
    saveCalendarToDisk();
    console.log(`Initialized persistent academic calendar with ${memoryCalendarEvents.length} official MCA events.`);
  } else {
    // Ensure all seed events are present without duplicating
    let added = 0;
    for (const seed of OFFICIAL_MCA_SEED_EVENTS) {
      if (!memoryCalendarEvents.some(e => e.id === seed.id || e.title === seed.title)) {
        memoryCalendarEvents.push(seed);
        added++;
      }
    }
    if (added > 0) {
      saveCalendarToDisk();
      console.log(`Added ${added} missing official MCA seed events to persistent academic calendar.`);
    }
  }
}

initializeCalendarData();

// Helper to format date relative state ("TODAY", "TOMORROW", "UPCOMING", "PAST")
function getRelativeDateState(startDateStr, refDateStr = null) {
  if (!startDateStr) return "UPCOMING";
  
  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  refDate.setHours(0, 0, 0, 0);

  const eventDate = new Date(startDateStr);
  eventDate.setHours(0, 0, 0, 0);

  const diffMs = eventDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";
  if (diffDays > 1) return "UPCOMING";
  return "PAST";
}

// Helper: Get events matching filters & role permissions
async function getAcademicCalendarEvents({
  departmentId = null,
  program = null,
  semester = null,
  academicYear = null,
  role = "student",
  userId = null,
  eventType = null,
  status = null,
  search = null,
  referenceDate = null,
} = {}) {
  // First try fetching from Supabase table
  let dbEvents = [];
  try {
    let query = supabaseAdmin
      .from("academic_calendar_events")
      .select("*")
      .order("start_date", { ascending: true });

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbEvents = data;
    }
  } catch (e) {}

  let events = dbEvents.length > 0 ? dbEvents : memoryCalendarEvents;

  // Normalize audience & role access control
  events = events.filter((ev) => {
    // 1. Role-based visibility
    const evStatus = ev.status || "PUBLISHED";
    if (role === "student" || role === "faculty") {
      if (evStatus !== "PUBLISHED") return false; // Students and faculty ONLY see PUBLISHED events!
    }

    // 2. Audience filter
    const audience = Array.isArray(ev.audience)
      ? ev.audience
      : typeof ev.audience === "string"
      ? [ev.audience.toLowerCase()]
      : ["all"];

    if (role === "student" && !audience.includes("students") && !audience.includes("all") && !audience.includes("all department users")) {
      // Keep if general holiday or default visibility
      if (ev.event_type !== "GENERAL_HOLIDAY" && ev.visibility !== "all" && ev.visibility !== "institution") {
        // Check if student audience match
      }
    }

    // 3. Department filter
    if (departmentId && ev.department_id) {
      const evDept = String(ev.department_id).toLowerCase().trim();
      const reqDept = String(departmentId).toLowerCase().trim();

      const isMcaReq = reqDept.includes("mca") || reqDept === "37909cba-a75d-428e-9181-fddf9920fb0b" || reqDept === "e1ddfa87-ddbb-4dae-baf9-e435e376c245";
      const isMcaEv = evDept.includes("mca") || evDept === "37909cba-a75d-428e-9181-fddf9920fb0b" || evDept === "dept-mca";

      const deptMatch = evDept === reqDept ||
        (isMcaReq && isMcaEv) ||
        ev.department_id === "ALL" || ev.visibility === "all" || ev.visibility === "institution";
      if (!deptMatch) return false;
    }

    // 4. Semester filter
    if (semester && ev.semester && semester !== "ALL") {
      const semMatch = String(ev.semester).toLowerCase() === String(semester).toLowerCase() || ev.semester === "ALL" || ev.semester === "III";
      if (!semMatch) return false;
    }

    // 5. Event type filter
    if (eventType) {
      if (eventType.toUpperCase() === "GENERAL_HOLIDAY" || eventType.toUpperCase() === "HOLIDAY") {
        if (ev.event_type !== "GENERAL_HOLIDAY" && ev.event_type !== "HOLIDAY") return false;
      } else if (ev.event_type !== eventType) {
        return false;
      }
    }

    // 6. Status filter (e.g., DRAFT, PUBLISHED, CANCELLED)
    if (status && ev.status !== status) {
      return false;
    }

    // 7. Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = (ev.title || "").toLowerCase().includes(q);
      const matchDesc = (ev.description || "").toLowerCase().includes(q);
      const matchType = (ev.event_type || "").toLowerCase().includes(q);
      const matchRemarks = (ev.remarks || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchType && !matchRemarks) return false;
    }

    return true;
  });

  // Enrich with dynamic state ("TODAY", "TOMORROW", "UPCOMING", "PAST")
  const enriched = events.map((ev) => {
    const startStr = ev.start_date || (ev.start_datetime ? ev.start_datetime.split("T")[0] : "");
    const relativeState = getRelativeDateState(startStr, referenceDate);
    return {
      ...ev,
      start_date: startStr,
      end_date: ev.end_date || startStr,
      relative_state: relativeState,
      is_tomorrow: relativeState === "TOMORROW",
      is_today: relativeState === "TODAY",
    };
  });

  // Sort by start_date ascending
  enriched.sort((a, b) => new Date(a.start_date || a.start_datetime) - new Date(b.start_date || b.start_datetime));

  return enriched;
}

// Get single event by ID
async function getAcademicCalendarEventById(eventId) {
  let ev = memoryCalendarEvents.find((e) => e.id === eventId);
  if (!ev) {
    try {
      const { data } = await supabaseAdmin.from("academic_calendar_events").select("*").eq("id", eventId).single();
      if (data) ev = data;
    } catch (e) {}
  }
  if (!ev) return null;

  const history = memoryCalendarHistory.filter((h) => h.event_id === eventId);
  return { ...ev, history };
}

// Create new calendar event (HOD / Admin workflow)
async function createAcademicCalendarEvent(eventPayload) {
  const eventId = eventPayload.id || `mca-cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  let startDate = eventPayload.start_date || eventPayload.start_datetime || new Date().toISOString().split("T")[0];
  if (startDate.includes("T")) startDate = startDate.split("T")[0];

  let endDate = eventPayload.end_date || eventPayload.end_datetime || startDate;
  if (endDate.includes("T")) endDate = endDate.split("T")[0];

  const status = eventPayload.status || "PUBLISHED"; // Or DRAFT if explicitly provided
  const now = new Date().toISOString();

  const newEvent = {
    id: eventId,
    title: eventPayload.title ? eventPayload.title.trim() : "Untitled Event",
    event_type: eventPayload.event_type || "ACADEMIC",
    department_id: eventPayload.department_id || "MCA",
    program: eventPayload.program || "MCA",
    semester: eventPayload.semester || "III",
    academic_year: eventPayload.academic_year || "2026-27",
    start_date: startDate,
    end_date: endDate,
    start_time: eventPayload.start_time || null,
    end_time: eventPayload.end_time || null,
    description: eventPayload.description || "",
    remarks: eventPayload.remarks || "",
    location: eventPayload.location || "MCA Department, DSATM",
    audience: Array.isArray(eventPayload.audience)
      ? eventPayload.audience
      : ["students", "faculty", "hod", "principal"],
    priority: eventPayload.priority || "NORMAL",
    status: status,
    created_by: eventPayload.created_by || "HOD",
    created_at: now,
    updated_by: eventPayload.created_by || "HOD",
    updated_at: now,
    published_by: status === "PUBLISHED" ? (eventPayload.published_by || eventPayload.created_by || "HOD") : null,
    published_at: status === "PUBLISHED" ? now : null,
    linked_exam_id: eventPayload.linked_exam_id || null,
    version: 1,
  };

  memoryCalendarEvents.push(newEvent);
  saveCalendarToDisk();

  // Log creation history
  const historyEntry = {
    id: `hist-${Date.now()}`,
    event_id: eventId,
    action: "CREATED",
    old_value: null,
    new_value: newEvent,
    changed_by: eventPayload.created_by || "HOD",
    changed_at: now,
    reason: "Initial calendar entry creation",
  };
  memoryCalendarHistory.push(historyEntry);
  saveHistoryToDisk();

  // Try inserting into Supabase
  try {
    await supabaseAdmin.from("academic_calendar_events").insert(newEvent);
  } catch (e) {}

  // Dispatch notifications if published immediately
  if (status === "PUBLISHED") {
    await dispatchEventNotifications(newEvent, "NEW_EVENT", {
      title: `📅 New Academic Event: ${newEvent.title}`,
      body: `Official Event Published: ${newEvent.title} (${newEvent.event_type}) on ${newEvent.start_date}. Location: ${newEvent.location}.`,
    });
  }

  return newEvent;
}

// Update existing calendar event
async function updateAcademicCalendarEvent(eventId, updatePayload, userPayload = {}) {
  const index = memoryCalendarEvents.findIndex((e) => e.id === eventId);
  if (index === -1) {
    throw new Error("Calendar event not found");
  }

  const oldEvent = { ...memoryCalendarEvents[index] };
  const now = new Date().toISOString();

  let startDate = updatePayload.start_date || updatePayload.start_datetime || oldEvent.start_date;
  if (startDate.includes("T")) startDate = startDate.split("T")[0];

  let endDate = updatePayload.end_date || updatePayload.end_datetime || updatePayload.start_date || oldEvent.end_date;
  if (endDate.includes("T")) endDate = endDate.split("T")[0];

  const dateChanged = oldEvent.start_date !== startDate || oldEvent.end_date !== endDate;
  const statusChanged = updatePayload.status && updatePayload.status !== oldEvent.status;

  const updatedEvent = {
    ...oldEvent,
    title: updatePayload.title !== undefined ? updatePayload.title.trim() : oldEvent.title,
    event_type: updatePayload.event_type || oldEvent.event_type,
    department_id: updatePayload.department_id || oldEvent.department_id,
    program: updatePayload.program || oldEvent.program,
    semester: updatePayload.semester || oldEvent.semester,
    academic_year: updatePayload.academic_year || oldEvent.academic_year,
    start_date: startDate,
    end_date: endDate,
    start_time: updatePayload.start_time !== undefined ? updatePayload.start_time : oldEvent.start_time,
    end_time: updatePayload.end_time !== undefined ? updatePayload.end_time : oldEvent.end_time,
    description: updatePayload.description !== undefined ? updatePayload.description : oldEvent.description,
    remarks: updatePayload.remarks !== undefined ? updatePayload.remarks : oldEvent.remarks,
    location: updatePayload.location !== undefined ? updatePayload.location : oldEvent.location,
    audience: updatePayload.audience || oldEvent.audience,
    priority: updatePayload.priority || oldEvent.priority,
    status: updatePayload.status || oldEvent.status,
    updated_by: userPayload.userId || "HOD",
    updated_at: now,
    version: (oldEvent.version || 1) + 1,
  };

  if (statusChanged && updatePayload.status === "PUBLISHED") {
    updatedEvent.published_by = userPayload.userId || "HOD";
    updatedEvent.published_at = now;
  }

  memoryCalendarEvents[index] = updatedEvent;
  saveCalendarToDisk();

  // Log edit history
  const historyEntry = {
    id: `hist-${Date.now()}`,
    event_id: eventId,
    action: statusChanged ? `STATUS_CHANGED_${updatePayload.status}` : "UPDATED",
    old_value: { start_date: oldEvent.start_date, end_date: oldEvent.end_date, title: oldEvent.title, status: oldEvent.status },
    new_value: { start_date: updatedEvent.start_date, end_date: updatedEvent.end_date, title: updatedEvent.title, status: updatedEvent.status },
    changed_by: userPayload.userId || "HOD",
    changed_at: now,
    reason: updatePayload.reason || (dateChanged ? "Event date revised" : "Event details updated"),
  };
  memoryCalendarHistory.push(historyEntry);
  saveHistoryToDisk();

  try {
    await supabaseAdmin.from("academic_calendar_events").update(updatedEvent).eq("id", eventId);
  } catch (e) {}

  // Dispatch change notification if event was already published
  if (oldEvent.status === "PUBLISHED" && updatedEvent.status === "PUBLISHED") {
    if (dateChanged) {
      await dispatchEventNotifications(updatedEvent, "EVENT_CHANGED", {
        title: `📢 Academic Calendar Update: ${updatedEvent.title}`,
        body: `The date of "${updatedEvent.title}" has been changed from ${oldEvent.start_date} to ${updatedEvent.start_date}. Changed by: ${userPayload.userRole || 'HOD'}.`,
        oldDate: oldEvent.start_date,
        newDate: updatedEvent.start_date,
      });
    }
  } else if (oldEvent.status !== "PUBLISHED" && updatedEvent.status === "PUBLISHED") {
    await dispatchEventNotifications(updatedEvent, "NEW_EVENT", {
      title: `📅 Official Academic Event Published: ${updatedEvent.title}`,
      body: `A new official event "${updatedEvent.title}" (${updatedEvent.event_type}) has been published for ${updatedEvent.start_date}.`,
    });
  }

  return updatedEvent;
}

// Publish draft event
async function publishAcademicCalendarEvent(eventId, userPayload = {}) {
  return await updateAcademicCalendarEvent(eventId, { status: "PUBLISHED" }, userPayload);
}

// Cancel published event
async function cancelAcademicCalendarEvent(eventId, reason = "Cancelled by Department HOD", userPayload = {}) {
  const index = memoryCalendarEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error("Calendar event not found");

  const oldEvent = memoryCalendarEvents[index];
  const now = new Date().toISOString();

  const updatedEvent = {
    ...oldEvent,
    status: "CANCELLED",
    remarks: `CANCELLED: ${reason}`,
    updated_by: userPayload.userId || "HOD",
    updated_at: now,
  };

  memoryCalendarEvents[index] = updatedEvent;
  saveCalendarToDisk();

  const historyEntry = {
    id: `hist-${Date.now()}`,
    event_id: eventId,
    action: "CANCELLED",
    old_value: { status: oldEvent.status },
    new_value: { status: "CANCELLED", reason },
    changed_by: userPayload.userId || "HOD",
    changed_at: now,
    reason: reason,
  };
  memoryCalendarHistory.push(historyEntry);
  saveHistoryToDisk();

  try {
    await supabaseAdmin.from("academic_calendar_events").update({ status: "CANCELLED", remarks: `CANCELLED: ${reason}` }).eq("id", eventId);
  } catch (e) {}

  if (oldEvent.status === "PUBLISHED") {
    await dispatchEventNotifications(updatedEvent, "EVENT_CANCELLED", {
      title: `⚠️ CANCELLED: Academic Calendar Event - ${updatedEvent.title}`,
      body: `Official Notice: The event "${updatedEvent.title}" scheduled for ${updatedEvent.start_date} has been CANCELLED. Reason: ${reason}.`,
    });
  }

  return updatedEvent;
}

// Delete event permanently
async function deleteAcademicCalendarEvent(eventId) {
  const index = memoryCalendarEvents.findIndex((ev) => ev.id === eventId);
  if (index !== -1) {
    memoryCalendarEvents.splice(index, 1);
    saveCalendarToDisk();
  }

  try {
    await supabaseAdmin.from("academic_calendar_events").delete().eq("id", eventId);
  } catch (e) {}

  return true;
}

// Duplicate existing event
async function duplicateAcademicCalendarEvent(eventId, userPayload = {}) {
  const original = memoryCalendarEvents.find((e) => e.id === eventId);
  if (!original) throw new Error("Original event not found");

  const duplicatedPayload = {
    ...original,
    id: undefined,
    title: `Copy of ${original.title}`,
    status: "DRAFT", // Duplicated events start as DRAFT for HOD review
    created_by: userPayload.userId || "HOD",
  };

  return await createAcademicCalendarEvent(duplicatedPayload);
}

// Notification & Email Dispatch Service with Idempotency
async function dispatchEventNotifications(event, notificationType, notifData) {
  try {
    const { notify, sendEmail } = require("./notification.service");

    // Fetch target audience users
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role");

    let recipientList = users || [
      { id: "demo-student-id", email: "student@dsatm.edu.in", full_name: "MCA Student", role: "student" },
      { id: "demo-faculty-id", email: "faculty@dsatm.edu.in", full_name: "MCA Faculty", role: "faculty" },
    ];

    // Filter recipients by audience
    const audience = Array.isArray(event.audience) ? event.audience.map(a => a.toLowerCase()) : ["students", "faculty"];
    recipientList = recipientList.filter((u) => {
      if (u.role === "student" && (audience.includes("students") || audience.includes("all"))) return true;
      if (u.role === "faculty" && (audience.includes("faculty") || audience.includes("all"))) return true;
      if (u.role === "hod" && (audience.includes("hod") || audience.includes("all"))) return true;
      if (u.role === "examdept" && (audience.includes("exam_dept") || audience.includes("all"))) return true;
      if (u.role === "principal" && (audience.includes("principal") || audience.includes("all"))) return true;
      return false;
    });

    const eventDateFormatted = new Date(event.start_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    for (const u of recipientList) {
      const idempotencyKey = `${event.id}:${u.id}:${notificationType}:${event.updated_at || event.created_at}`;

      // Check if already dispatched to avoid duplicate emails
      const existingLog = memoryNotifLogs.find((l) => l.key === idempotencyKey);
      if (existingLog) {
        console.log(`Skipping duplicate calendar email for user ${u.email} (${idempotencyKey})`);
        continue;
      }

      // Send In-App Notification
      notify(u.id, "academic_calendar", notifData.title, notifData.body).catch(() => {});

      // Send Email Notification
      let emailStatus = "SENT";
      let failureReason = null;

      if (u.email) {
        const emailSubject = `📢 DSATM Academic Alert: ${event.event_type} - ${event.title}`;
        let emailContent = "";

        if (notificationType === "EVENT_CHANGED") {
          emailContent = `Dear ${u.full_name || "Student/Faculty"},\n\nACADEMIC CALENDAR UPDATE:\n\nThe scheduled date for the official event "${event.title}" has been revised.\n\n📌 Event: ${event.title}\n🏷️ Category: ${event.event_type}\n🗓️ Old Date: ${notifData.oldDate}\n📅 New Date: ${eventDateFormatted}\n📍 Location: ${event.location || "DSATM Campus"}\n${event.description ? "📝 Notes: " + event.description + "\n" : ""}\nPlease log in to the LMS Academic Portal to view the complete updated calendar.\n\nRegards,\nDepartment MCA & Academic Management System\nDSATM`;
        } else if (notificationType === "EVENT_CANCELLED") {
          emailContent = `Dear ${u.full_name || "Student/Faculty"},\n\nACADEMIC CALENDAR NOTICE:\n\nPlease note that the following event has been CANCELLED:\n\n📌 Event: ${event.title}\n🗓️ Originally Scheduled Date: ${eventDateFormatted}\n⚠️ Status: CANCELLED\n📝 Reason: ${event.remarks || "Cancelled by Department Authority"}\n\nPlease check your Academic Dashboard for the latest schedule.\n\nRegards,\nDepartment MCA\nDSATM`;
        } else {
          emailContent = `Dear ${u.full_name || "Student/Faculty"},\n\nA new official academic event has been published on the Department Academic Calendar:\n\n📌 Event: ${event.title}\n🏷️ Category: ${event.event_type}\n📅 Scheduled Date: ${eventDateFormatted}\n📍 Location: ${event.location || "DSATM Campus"}\n${event.description ? "📝 Details: " + event.description + "\n" : ""}\nPlease log in to the LMS Academic Portal to view the full academic schedule.\n\nRegards,\nDepartment MCA\nDayananda Sagar Academy of Technology and Management (DSATM)`;
        }

        try {
          await sendEmail(u.email, emailSubject, emailContent);
        } catch (err) {
          emailStatus = "FAILED";
          failureReason = err.message;
        }
      }

      // Log notification entry
      const logRecord = {
        id: `notif-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        key: idempotencyKey,
        event_id: event.id,
        user_id: u.id,
        user_email: u.email,
        notification_type: notificationType,
        channel: u.email ? "EMAIL_AND_INAPP" : "INAPP",
        status: emailStatus,
        failure_reason: failureReason,
        sent_at: new Date().toISOString(),
      };

      memoryNotifLogs.push(logRecord);
      saveNotifLogsToDisk();
    }
  } catch (err) {
    console.warn("Calendar notification dispatch error:", err.message);
  }
}

// Bulk import calendar rows from uploaded document JSON/CSV preview
async function importAcademicCalendarEvents(rawEvents = [], userPayload = {}) {
  const importedList = [];
  for (const item of rawEvents) {
    if (!item.title) continue;
    const created = await createAcademicCalendarEvent({
      ...item,
      created_by: userPayload.userId || "HOD",
      published_by: userPayload.userId || "HOD",
      status: item.status || "PUBLISHED",
    });
    importedList.push(created);
  }
  return importedList;
}

// 1-Day Before Automated Notification Service
async function checkAndSendOneDayBeforeNotifications() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split("T")[0];

    const upcomingTomorrowEvents = memoryCalendarEvents.filter((ev) => {
      const start = ev.start_date || (ev.start_datetime ? ev.start_datetime.split("T")[0] : "");
      return start === tomorrowIso && (ev.status || "PUBLISHED") === "PUBLISHED";
    });

    for (const ev of upcomingTomorrowEvents) {
      const typeLabel = ev.event_type === "GENERAL_HOLIDAY" ? "Holiday 🇮🇳" : (ev.event_type || "Event");
      await dispatchEventNotifications(ev, "ONE_DAY_BEFORE_REMINDER", {
        title: `⚡ Reminder: Tomorrow is ${ev.title} (${typeLabel})`,
        body: `Dear Student/Faculty,\n\nPlease be reminded that tomorrow (${tomorrowIso}) is scheduled for "${ev.title}".\n\nCategory: ${ev.event_type}\nLocation: ${ev.location || "DSATM Campus"}\n${ev.description ? "Details: " + ev.description : ""}\n\nRegards,\nDepartment Academic Management System\nDSATM`,
        oldDate: tomorrowIso
      });
    }
  } catch (e) {
    console.warn("One-day-before notification check error:", e.message);
  }
}

module.exports = {
  getAcademicCalendarEvents,
  getAcademicCalendarEventById,
  createAcademicCalendarEvent,
  updateAcademicCalendarEvent,
  publishAcademicCalendarEvent,
  cancelAcademicCalendarEvent,
  deleteAcademicCalendarEvent,
  duplicateAcademicCalendarEvent,
  importAcademicCalendarEvents,
  checkAndSendOneDayBeforeNotifications,
  getRelativeDateState,
  OFFICIAL_MCA_SEED_EVENTS,
};
