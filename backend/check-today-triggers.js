const fs = require("fs");
const path = require("path");

const logFile = path.resolve(__dirname, "./data/persistent_calendar_notif_logs.json");
const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));

const todayLogs = logs.filter(l => l.sent_at && l.sent_at.startsWith("2026-10-28"));

console.log("Total entries on 2026-10-28:", todayLogs.length);

const grouped = {};
todayLogs.forEach(l => {
  const key = `${l.event_id} | ${l.notification_type} | ${l.sent_at.substring(0, 16)}`;
  grouped[key] = (grouped[key] || 0) + 1;
});

console.log("\nBatches triggered today:");
console.log(JSON.stringify(grouped, null, 2));

const recipients = todayLogs.map(l => ({ email: l.user_email, status: l.status, time: l.sent_at }));
console.log("\nSample recipients today:");
console.log(JSON.stringify(recipients.slice(0, 10), null, 2));
