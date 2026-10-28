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

  // Dispatch notifications asynchronously in the background if published immediately
  if (status === "PUBLISHED") {
    setImmediate(() => {
      dispatchEventNotifications(newEvent, "NEW_EVENT", {
        title: `📅 New Academic Event: ${newEvent.title}`,
        body: `Official Event Published: ${newEvent.title} (${newEvent.event_type}) on ${newEvent.start_date}. Location: ${newEvent.location || 'DSATM Campus'}.`,
      }).catch((e) => console.warn("Background calendar notification error:", e.message));
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

  // Dispatch change notification asynchronously in the background if event was already published
  if (oldEvent.status === "PUBLISHED" && updatedEvent.status === "PUBLISHED") {
    if (dateChanged) {
      setImmediate(() => {
        dispatchEventNotifications(updatedEvent, "EVENT_CHANGED", {
          title: `📢 Academic Calendar Update: ${updatedEvent.title}`,
          body: `The date of "${updatedEvent.title}" has been changed from ${oldEvent.start_date} to ${updatedEvent.start_date}. Changed by: ${userPayload.userRole || 'HOD'}.`,
          oldDate: oldEvent.start_date,
          newDate: updatedEvent.start_date,
        }).catch((e) => console.warn("Background calendar update error:", e.message));
      });
    }
  } else if (oldEvent.status !== "PUBLISHED" && updatedEvent.status === "PUBLISHED") {
    setImmediate(() => {
      dispatchEventNotifications(updatedEvent, "NEW_EVENT", {
        title: `📅 Official Academic Event Published: ${updatedEvent.title}`,
        body: `A new official event "${updatedEvent.title}" (${updatedEvent.event_type}) has been published for ${updatedEvent.start_date}.`,
      }).catch((e) => console.warn("Background calendar publish error:", e.message));
    });
  }

  return updatedEvent;
}

// Publish draft event
async function publishAcademicCalendarEvent(eventId, userPayload = {}) {
  const index = memoryCalendarEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error("Calendar event not found");

  const now = new Date().toISOString();
  const updatedEvent = {
    ...memoryCalendarEvents[index],
    status: "PUBLISHED",
    published_by: userPayload.userId || "HOD",
    published_at: now,
    updated_by: userPayload.userId || "HOD",
    updated_at: now,
  };

  memoryCalendarEvents[index] = updatedEvent;
  saveCalendarToDisk();

  try {
    await supabaseAdmin.from("academic_calendar_events").update({
      status: "PUBLISHED",
      published_by: updatedEvent.published_by,
      published_at: now,
      updated_at: now,
    }).eq("id", eventId);
  } catch (e) {}

  // Explicitly dispatch publish notification
  setImmediate(() => {
    dispatchEventNotifications(updatedEvent, "NEW_EVENT", {
      title: `📅 Official Academic Event Published: ${updatedEvent.title}`,
      body: `Official Event Published: ${updatedEvent.title} (${updatedEvent.event_type}) scheduled for ${updatedEvent.start_date}. Location: ${updatedEvent.location || 'DSATM Campus'}.`,
    }).catch((e) => console.warn("Background calendar publish error:", e.message));
  });

  return updatedEvent;
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
    setImmediate(() => {
      dispatchEventNotifications(updatedEvent, "EVENT_CANCELLED", {
        title: `⚠️ CANCELLED: Academic Calendar Event - ${updatedEvent.title}`,
        body: `Official Notice: The event "${updatedEvent.title}" scheduled for ${updatedEvent.start_date} has been CANCELLED. Reason: ${reason}.`,
      }).catch((e) => console.warn("Background calendar cancel error:", e.message));
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

const DEPARTMENT_NAMES = {
  "37909cba-a75d-428e-9181-fddf9920fb0b": "Department of Computer Applications (MCA)",
  "2d81ff48-375e-4653-970a-8485e365f379": "Department of Computer Science & Engineering (CSE)",
  "93014f59-605b-46c1-b00f-9c9f5ba133a6": "Department of Information Science & Engineering (ISE)",
  "adcef4b6-d777-4f39-91fb-b0ab01ff2bdf": "Department of AI & Machine Learning (AI & ML)",
  "bbca09b5-3d93-45c0-b0bb-f1869036a2ae": "Department of Electronics & Communication (ECE)",
  "fe6cdcf6-fb16-4b16-847d-ff80c76d7f23": "Department of Electrical & Electronics (EEE)",
  "4323ce94-9116-484e-958a-91bbf6f67d0e": "Department of Mechanical Engineering (ME)",
  "fece5a02-62ae-48e2-81ee-46a999788209": "Department of Civil Engineering (CIVIL)",
  "b76b7f87-9bda-4eab-8517-7a862fe4a048": "Department of Computer Applications (BCA)",
  "e79b98ba-807e-4ba3-aec6-0ed9bd9fe213": "Department of Management Studies (MBA)",
  "227bdd38-39c6-485b-9b2d-aa46f57bdbb3": "Department of Computer Science (CS)",
};

// Official DSATM Academic & Examination Email HTML Template Generator
function generateAcademicCalendarHtml({ event, recipientName, recipientRole, notificationType, notifData }) {
  const portalUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const dsiLogoUrl = `${portalUrl}/dsi-logo.png`;

  const isHoliday = (event.event_type || "").toUpperCase().includes("HOLIDAY");
  const isExam = (event.event_type || "").toUpperCase().includes("EXAM") || (event.title || "").toLowerCase().includes("internal");
  const isCancelled = notificationType === "EVENT_CANCELLED";
  const isChanged = notificationType === "EVENT_CHANGED";

  // Clean Title: strip accidental "Copy of "
  const rawTitle = String(event.title || "Academic Event").trim();
  const cleanTitle = rawTitle.replace(/^Copy\s+of\s+/i, "").trim();

  // Clean recipient name: strip internal suffixes e.g. "Nagaraj_MCA" -> "Nagaraj"
  const cleanRecipientName = (recipientName || "Student")
    .replace(/_mca$/i, "")
    .replace(/_/g, " ")
    .trim();

  const role = (recipientRole || "student").toLowerCase().trim();
  const isFaculty = role === "faculty" || role === "teacher";
  const isHod = role === "hod";
  const isPrincipal = role === "principal";
  const isStaff = isFaculty || isHod || isPrincipal;

  // Role-appropriate Salutation
  let salutation = `Dear <strong>${cleanRecipientName}</strong>,`;
  if (isFaculty) {
    salutation = `Dear Prof. <strong>${cleanRecipientName}</strong>,`;
  } else if (isHod) {
    salutation = `Respected Head of Department (Prof. <strong>${cleanRecipientName}</strong>),`;
  } else if (isPrincipal) {
    salutation = `Respected Principal,`;
  }

  // Role-appropriate Portal Button & Link
  let buttonUrl = `${portalUrl}`;
  let buttonText = "🚀 Open Student Portal & Exam Desk &rarr;";
  let buttonSubtext = "Log in to your DSATM Student Portal to view detailed question patterns, course notes, and room seating allotments.";

  if (isFaculty) {
    buttonUrl = `${portalUrl}/faculty`;
    buttonText = "🚀 Open Faculty Portal & Valuation Desk &rarr;";
    buttonSubtext = "Log in to your DSATM Faculty Portal to view invigilation duties, course rubrics, and answer verification queue.";
  } else if (isHod) {
    buttonUrl = `${portalUrl}/hod`;
    buttonText = "🚀 Open HOD Department Dashboard &rarr;";
    buttonSubtext = "Log in to manage departmental exam schedules, faculty invigilators, and evaluation progress.";
  } else if (isPrincipal) {
    buttonUrl = `${portalUrl}/principal`;
    buttonText = "🚀 Open Institutional Dashboard &rarr;";
    buttonSubtext = "Log in to monitor institution-wide academic schedules and autonomous compliance.";
  }

  // Resolve Human-Readable Department Name
  let deptName = "Department of Computer Applications (MCA)";
  if (event.department_id && DEPARTMENT_NAMES[event.department_id]) {
    deptName = DEPARTMENT_NAMES[event.department_id];
  } else if (event.program) {
    deptName = `Department of ${event.program}`;
  } else if (event.department_name) {
    deptName = event.department_name;
  } else if (event.department_id && !event.department_id.includes("-")) {
    deptName = event.department_id;
  }

  // Format Semester & Program
  const semFormatted = event.semester
    ? (event.semester.toUpperCase().startsWith("SEM") ? event.semester : `Semester ${event.semester}`)
    : "Semester III";
  const programFormatted = event.program || "MCA";

  let badgeColor = "#2563eb";
  let badgeBg = "#eff6ff";
  let badgeBorder = "#bfdbfe";
  let badgeText = "📅 OFFICIAL ACADEMIC EVENT";
  let bannerHeader = "Academic Notification";

  if (isCancelled) {
    badgeColor = "#dc2626";
    badgeBg = "#fef2f2";
    badgeBorder = "#fecaca";
    badgeText = "⚠️ EVENT CANCELLED";
    bannerHeader = "Academic Event Cancellation";
  } else if (isHoliday) {
    badgeColor = "#059669";
    badgeBg = "#ecfdf5";
    badgeBorder = "#a7f3d0";
    badgeText = "🌴 OFFICIAL GENERAL HOLIDAY";
    bannerHeader = "General Holiday Announcement";
  } else if (isExam) {
    badgeColor = "#4f46e5";
    badgeBg = "#eef2ff";
    badgeBorder = "#c7d2fe";
    badgeText = "📝 OFFICIAL EXAMINATION NOTICE";
    bannerHeader = "Examination Schedule Alert";
  } else if (isChanged) {
    badgeColor = "#d97706";
    badgeBg = "#fffbeb";
    badgeBorder = "#fde68a";
    badgeText = "📢 SCHEDULE REVISION";
    bannerHeader = "Academic Calendar Revision";
  }

  const startDateFormatted = new Date(event.start_date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const endDateFormatted = event.end_date && event.end_date !== event.start_date
    ? new Date(event.end_date).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const dateDisplay = endDateFormatted
    ? `${startDateFormatted} &rarr; ${endDateFormatted}`
    : startDateFormatted;

  const startTimeDisplay = event.start_time
    ? event.start_time
    : (isExam ? "10:00 AM" : "10:00 AM");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 640px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.1); border: 1px solid #e2e8f0;">
          
          <!-- Header with College Crest & Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 26px 30px; text-align: center; color: #ffffff;">
              <div style="margin-bottom: 12px;">
                <img src="${dsiLogoUrl}" alt="DSATM College Logo" style="height: 56px; width: auto; max-width: 200px; object-fit: contain; display: inline-block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));" />
              </div>
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px;">
                🎓 ${bannerHeader}
              </div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; line-height: 1.3;">
                DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                Autonomous Institute under VTU | Approved by AICTE, New Delhi
              </p>
            </td>
          </tr>

          <!-- Notice Banner Card -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <div style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-left: 5px solid ${badgeColor}; padding: 16px 20px; border-radius: 0 10px 10px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: ${badgeColor}; font-weight: 900; letter-spacing: 0.8px;">${badgeText}</div>
                <h2 style="margin: 6px 0 0 0; color: #0f172a; font-size: 21px; font-weight: 900; line-height: 1.3;">${cleanTitle}</h2>
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 14px 30px 24px 30px; color: #334155;">
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #1e293b;">
                ${salutation}
              </p>

              ${
                isCancelled
                  ? `<p style="font-size: 14px; line-height: 1.6; color: #dc2626;">
                      <strong>OFFICIAL NOTICE:</strong> The scheduled event <strong>"${cleanTitle}"</strong> has been <span style="text-decoration: underline;">CANCELLED</span> by the Department Authority.
                    </p>`
                  : isHoliday
                  ? `<p style="font-size: 14px; line-height: 1.6; color: #047857;">
                      <strong>GENERAL HOLIDAY NOTICE:</strong> The institution has officially declared a general holiday on the date(s) specified below:
                    </p>`
                  : isChanged
                  ? `<p style="font-size: 14px; line-height: 1.6; color: #b45309;">
                      <strong>SCHEDULE UPDATE:</strong> The scheduled date/details for <strong>"${cleanTitle}"</strong> have been revised by the Controller of Examinations:
                    </p>`
                  : `<p style="font-size: 14px; line-height: 1.6; color: #334155;">
                      ${isStaff ? 'Please find below the official schedule and faculty invigilation/valuation instructions for your department:' : 'Please find below the official schedule and guidelines for your upcoming academic examination released by the DSATM Academic Cell:'}
                    </p>`
              }

              <!-- Event Particulars Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 18px 0; overflow: hidden; box-shadow: 0 2px 6px rgba(15,23,42,0.02);">
                <tr>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; width: 160px; font-weight: 700; font-size: 13px; color: #64748b;">
                    ${isExam ? '🗓️ Examination Date:' : isHoliday ? '🌴 Holiday Date:' : '🗓️ Scheduled Date:'}
                  </td>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 14px; color: #0f172a;">
                    ${dateDisplay}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #64748b;">
                    ${isExam ? '⏰ Session Start Time:' : isHoliday ? '⏰ Holiday Duration:' : '⏰ Event Start Time:'}
                  </td>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 14px; color: #0f172a;">
                    ${isHoliday ? 'Full Day Institutional Observance' : startTimeDisplay}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #64748b;">
                    🏷️ Category:
                  </td>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
                    ${event.event_type || (isExam ? 'Internal Examination (CIE)' : 'Official Academic Event')}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #64748b;">
                    🏛️ Department:
                  </td>
                  <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e3a8a; font-weight: 800;">
                    ${isHoliday ? 'All College Departments & Administrative Offices' : deptName}
                  </td>
                </tr>
                ${
                  !isHoliday
                    ? `<tr>
                        <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #64748b;">
                          🎓 Class / Semester:
                        </td>
                        <td style="padding: 13px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700;">
                          ${semFormatted} (${programFormatted}) &bull; Batch ${event.academic_year || '2026-27'}
                        </td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 13px 20px; font-weight: 700; font-size: 13px; color: #64748b;">
                    ${isExam ? '📍 Exam Hall / Venue:' : isHoliday ? '📍 Scope / Campus:' : '📍 Venue / Hall:'}
                  </td>
                  <td style="padding: 13px 20px; font-size: 13px; color: #0f172a; font-weight: 700;">
                    ${isHoliday ? 'All Campuses & Academic Blocks' : (event.location || 'MCA Department Examination Halls, DSATM')}
                  </td>
                </tr>
              </table>

              ${
                event.description
                  ? `<div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
                      <div style="font-size: 11px; font-weight: 900; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📝 ${isExam ? 'Syllabus Coverage & Notes' : 'Event Description & Details'}:</div>
                      <div style="font-size: 13px; line-height: 1.6; color: #334155;">${event.description.replace(/\n/g, '<br/>')}</div>
                    </div>`
                  : ''
              }

              ${
                isExam
                  ? isStaff
                    ? `<!-- Mandatory Guidelines for Faculty & Invigilators -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                  📋 Faculty Invigilation & Evaluation Guidelines
                </div>
                <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 12px; color: #334155; line-height: 1.55;">
                  <tr>
                    <td style="width: 22px; vertical-align: top;">📝</td>
                    <td><strong>QP & Rubrics Readiness:</strong> Verify approved question papers and scheme of evaluation in the portal.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">⏱️</td>
                    <td><strong>Duty Reporting:</strong> Invigilation faculty must report to the Exam Control Room 30 minutes prior to session commencement.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">📄</td>
                    <td><strong>Script Collection & Sealing:</strong> Reconcile student attendance and seal collected answer booklets immediately upon session completion.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">🤖</td>
                    <td><strong>AI Valuation Desk:</strong> Complete teacher-verification and scoring of AI-evaluated scripts within the scheduled valuation window.</td>
                  </tr>
                </table>
              </div>`
                    : `<!-- Mandatory Guidelines for Examinees -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                  📋 Mandatory Examinee Guidelines
                </div>
                <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 12px; color: #334155; line-height: 1.55;">
                  <tr>
                    <td style="width: 22px; vertical-align: top;">🪪</td>
                    <td><strong>Student Verification:</strong> Students must carry their valid College ID card and Hall Ticket to the exam hall.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">⏱️</td>
                    <td><strong>Punctuality:</strong> Candidates must occupy their designated room and seat at least 15 minutes prior to the start time.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">🚫</td>
                    <td><strong>Prohibited Devices:</strong> Smartwatches, mobile phones, and unauthorized study notes are strictly forbidden inside the hall.</td>
                  </tr>
                  <tr>
                    <td style="width: 22px; vertical-align: top;">⚖️</td>
                    <td><strong>Evaluation Protocol:</strong> Answer scripts are evaluated in accordance with VTU autonomous rubrics and verified by faculty.</td>
                  </tr>
                </table>
              </div>`
                  : isHoliday
                  ? `<!-- Holiday Advisory -->
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                  🌴 Official Holiday Advisory
                </div>
                <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.6;">
                  Dayananda Sagar Academy of Technology & Management will observe a general holiday on this date as per the official VTU academic calendar. All scheduled academic sessions, laboratory practicals, and administrative services will remain closed. Regular classes resume on the next working day.
                </p>
              </div>`
                  : ''
              }

              ${
                isCancelled && event.remarks
                  ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin: 16px 0; color: #991b1b;">
                      <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">⚠️ Cancellation Reason:</div>
                      <div style="font-size: 13px; line-height: 1.6;">${event.remarks}</div>
                    </div>`
                  : ''
              }

              <!-- Role-Tailored Portal Action Button -->
              <div style="text-align: center; margin-top: 26px; margin-bottom: 8px;">
                <a href="${buttonUrl}" target="_blank" style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; font-weight: 800; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.35); letter-spacing: 0.3px;">
                  ${buttonText}
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 12px; text-align: center;">
                ${buttonSubtext}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 800; color: #334155; margin-bottom: 4px;">Dayananda Sagar Academy of Technology & Management (DSATM)</div>
              <div>Autonomous Institute under VTU | Approved by AICTE, New Delhi</div>
              <div style="margin-top: 4px; font-size: 11px; color: #64748b;">Opp. Art of Living, Kanakapura Main Road, Bangalore - 560082</div>
              <div style="margin-top: 8px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                This is an official automated notification from the DSATM Controller of Examinations & Academic Portal.<br/>
                &copy; 2026 Dayananda Sagar Institutions. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Notification & Email Dispatch Service with Idempotency
async function dispatchEventNotifications(event, notificationType, notifData) {
  try {
    const { notify, sendEmail } = require("./notification.service");

    // Fetch target audience users
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, department_id, semester");

    let recipientList = (users && users.length > 0) ? users : [
      { id: "demo-student-id", email: "student@dsatm.edu.in", full_name: "MCA Student", role: "student" },
      { id: "demo-faculty-id", email: "faculty@dsatm.edu.in", full_name: "MCA Faculty", role: "faculty" },
    ];

    // Normalize audience
    let audience = [];
    if (Array.isArray(event.audience)) {
      audience = event.audience.map((a) => String(a).toLowerCase().trim());
    } else if (typeof event.audience === "string") {
      audience = event.audience.toLowerCase().split(/[, ]+/).filter(Boolean);
    }
    if (audience.length === 0) {
      audience = ["students", "student", "faculty", "hod", "exam_dept", "examdept", "principal", "all"];
    }

    const isGeneralHoliday = (event.event_type || "").toUpperCase().includes("HOLIDAY");
    const isCollegeWide =
      isGeneralHoliday ||
      audience.includes("all") ||
      !event.department_id ||
      event.department_id === "ALL" ||
      event.department_id === "all";

    // Filter recipients by audience & department
    recipientList = recipientList.filter((u) => {
      if (!u.email) return false;
      const role = (u.role || "").toLowerCase().trim();

      let roleEligible = false;
      if (role === "student" && (isGeneralHoliday || audience.includes("students") || audience.includes("student") || audience.includes("all"))) {
        roleEligible = true;
      } else if (role === "faculty" && (isGeneralHoliday || audience.includes("faculty") || audience.includes("all"))) {
        roleEligible = true;
      } else if (role === "hod" && (isGeneralHoliday || audience.includes("hod") || audience.includes("all"))) {
        roleEligible = true;
      } else if (
        (role === "examdept" || role === "exam_dept") &&
        (isGeneralHoliday || audience.includes("exam_dept") || audience.includes("examdept") || audience.includes("all"))
      ) {
        roleEligible = true;
      } else if (role === "principal" && (isGeneralHoliday || audience.includes("principal") || audience.includes("all"))) {
        roleEligible = true;
      } else if (role === "admin") {
        roleEligible = true;
      }

      if (!roleEligible) return false;

      // Department filter for non-holiday department-specific events
      if (!isCollegeWide && event.department_id && u.department_id && role === "student") {
        if (String(u.department_id).toLowerCase() !== String(event.department_id).toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    const eventDateFormatted = new Date(event.start_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    for (const u of recipientList) {
      const idempotencyKey = `${event.id}:${u.id}:${notificationType}:${event.updated_at || event.created_at}`;

      // Check if already dispatched successfully to avoid duplicate emails
      const existingLog = memoryNotifLogs.find((l) => l.key === idempotencyKey && l.status === "SENT");
      if (existingLog) {
        continue;
      }

      // Send In-App Notification (non-blocking)
      notify(u.id, "academic_calendar", notifData.title, notifData.body).catch(() => {});

      // Send Email Notification
      let emailStatus = "SENT";
      let failureReason = null;

      if (u.email) {
        const cleanSubjectTitle = String(event.title || "Academic Event").replace(/^Copy\s+of\s+/i, "").trim();
        const role = (u.role || "student").toLowerCase().trim();
        const isFaculty = role === "faculty" || role === "teacher";
        const isHod = role === "hod";
        const isPrincipal = role === "principal";

        const salutationText = isFaculty
          ? `Dear Prof. ${u.full_name || "Faculty"}`
          : isHod
          ? `Respected Head of Department (${u.full_name || "HOD"})`
          : isPrincipal
          ? `Respected Principal`
          : `Dear ${u.full_name || "Student"}`;

        const portalActionText = isFaculty
          ? "Please log in to your DSATM Faculty Portal to view invigilation duties, course rubrics, and the answer verification queue."
          : isHod
          ? "Please log in to your HOD Department Dashboard to oversee invigilation allocations and exam conduct."
          : isPrincipal
          ? "Please log in to the Institutional Dashboard to review schedule status."
          : "Please log in to your Student Portal to view full exam seating, hall allotment, and syllabus guidelines.";

        const emailSubject = `📢 DSATM Academic Alert: ${event.event_type || 'Examination'} - ${cleanSubjectTitle}`;
        let emailContent = "";

        if (notificationType === "EVENT_CHANGED") {
          emailContent = `${salutationText},\n\nACADEMIC CALENDAR UPDATE:\n\nThe scheduled date for the official event "${cleanSubjectTitle}" has been revised.\n\n📌 Event: ${cleanSubjectTitle}\n🏷️ Category: ${event.event_type}\n🗓️ Old Date: ${notifData.oldDate}\n📅 New Date: ${eventDateFormatted}\n📍 Location: ${event.location || "DSATM Campus"}\n${event.description ? "📝 Notes: " + event.description + "\n" : ""}\n${portalActionText}\n\nRegards,\nDayananda Sagar Academy of Technology & Management (DSATM)`;
        } else if (notificationType === "EVENT_CANCELLED") {
          emailContent = `${salutationText},\n\nACADEMIC CALENDAR NOTICE:\n\nPlease note that the following event has been CANCELLED:\n\n📌 Event: ${cleanSubjectTitle}\n🗓️ Originally Scheduled Date: ${eventDateFormatted}\n⚠️ Status: CANCELLED\n📝 Reason: ${event.remarks || "Cancelled by Department Authority"}\n\n${portalActionText}\n\nRegards,\nDayananda Sagar Academy of Technology & Management (DSATM)`;
        } else {
          emailContent = `${salutationText},\n\nA new official academic event has been published on the DSATM Portal:\n\n📌 Event: ${cleanSubjectTitle}\n🏷️ Category: ${event.event_type}\n📅 Scheduled Date: ${eventDateFormatted}\n📍 Location: ${event.location || "DSATM Campus"}\n${event.description ? "📝 Details: " + event.description + "\n" : ""}\n${portalActionText}\n\nRegards,\nDayananda Sagar Academy of Technology & Management (DSATM)`;
        }

        const emailHtml = generateAcademicCalendarHtml({
          event,
          recipientName: u.full_name,
          recipientRole: u.role,
          notificationType,
          notifData,
        });

        try {
          await sendEmail(u.email, emailSubject, emailContent, emailHtml);
          console.log(`[CALENDAR EMAIL SENT] To: ${u.email} (${u.role})`);
        } catch (err) {
          emailStatus = "FAILED";
          failureReason = err.message;
          console.warn(`[CALENDAR EMAIL FAILED] To: ${u.email} (${u.role}) Reason: ${err.message}`);
        }

        // Small pacing delay to avoid SMTP rate limiting on bulk sends
        await new Promise((r) => setTimeout(r, 60));
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
  generateAcademicCalendarHtml,
  OFFICIAL_MCA_SEED_EVENTS,
};
