const fs = require("fs");
const path = require("path");

const CALENDAR_FILE = path.join(__dirname, "../data/persistent_academic_calendar.json");
const MCA_DEPT_ID = "37909cba-a75d-428e-9181-fddf9920fb0b";

function cleanCalendarData() {
  console.log("=== CLEANING CALENDAR EVENTS TO OFFICIAL SHEET ONLY ===");
  if (!fs.existsSync(CALENDAR_FILE)) return;

  const raw = fs.readFileSync(CALENDAR_FILE, "utf8");
  let events = JSON.parse(raw);

  // Filter out any duplicate test entries like "cal-1790760580928-ifkes" (Internal 1)
  events = events.filter((ev) => ev.id !== "cal-1790760580928-ifkes" && ev.id !== "cal-test");

  events = events.map((ev) => {
    const startDateStr = ev.start_date || (ev.start_datetime ? ev.start_datetime.split("T")[0] : "");
    const endDateStr = ev.end_date || (ev.end_datetime ? ev.end_datetime.split("T")[0] : startDateStr);

    return {
      ...ev,
      department_id: MCA_DEPT_ID,
      start_date: startDateStr,
      end_date: endDateStr,
      status: "PUBLISHED",
      audience: Array.isArray(ev.audience) ? ev.audience : ["students", "faculty", "hod", "principal"],
      visibility: "all"
    };
  });

  fs.writeFileSync(CALENDAR_FILE, JSON.stringify(events, null, 2), "utf8");
  console.log(`Cleaned calendar data. Total official events: ${events.length}`);
}

cleanCalendarData();
