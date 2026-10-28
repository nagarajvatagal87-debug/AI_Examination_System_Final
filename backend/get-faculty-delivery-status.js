const fs = require("fs");
const path = require("path");

const logFile = path.resolve(__dirname, "./data/persistent_calendar_notif_logs.json");
const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
const todayLogs = logs.filter(l => l.sent_at && l.sent_at.startsWith("2026-10-28") && l.status === "SENT");
const deliveredEmails = new Set(todayLogs.map(l => l.user_email?.toLowerCase()));

const facultyList = [
  { name: "Bharath", email: "bharath-mca@dsatm.edu.in" },
  { name: "Priya", email: "priyadarshini-mca@dsatm.edu.in" },
  { name: "Hamsaveni", email: "hamsaveni@dsatm.edu.in" },
  { name: "Ushashree", email: "ushashree-mca@dsatm.edu.in" },
  { name: "Enoch", email: "enoch-mca@dsatm.edu.in" },
  { name: "Usha", email: "nagarajvatagal7@gmail.com" },
];

const hodList = [
  { name: "Nagaraj_MCA (HOD)", email: "naga2003@gmail.com" },
  { name: "raju (HOD)", email: "nagarajvatagal88@gmail.com" },
  { name: "Bhuvi (HOD)", email: "hod@gmail.com" },
  { name: "Nagaraj (Principal)", email: "nagarajvatagal8@gmail.com" },
];

console.log("=== 1. FACULTY DELIVERY STATUS TODAY ===");
facultyList.forEach(f => {
  const isDelivered = deliveredEmails.has(f.email.toLowerCase());
  console.log(` - ${f.name} (${f.email}) -> ${isDelivered ? "✅ DELIVERED" : "❌ FAILED (454 Throttle)"}`);
});

console.log("\n=== 2. HOD & LEADERSHIP DELIVERY STATUS TODAY ===");
hodList.forEach(h => {
  const isDelivered = deliveredEmails.has(h.email.toLowerCase());
  console.log(` - ${h.name} (${h.email}) -> ${isDelivered ? "✅ DELIVERED" : "❌ FAILED (454 Throttle)"}`);
});

const studentDelivered = [];
deliveredEmails.forEach(e => {
  if (e.includes("@dsatm.edu.in") && !facultyList.some(f => f.email.toLowerCase() === e)) {
    studentDelivered.push(e);
  }
});

console.log(`\n=== 3. STUDENTS DELIVERED TODAY (${studentDelivered.length} Students) ===`);
console.log(studentDelivered.slice(0, 15).join(", ") + " ...and more");
