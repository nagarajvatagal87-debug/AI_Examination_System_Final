const fs = require("fs");
const path = require("path");

const logFile = path.resolve(__dirname, "./data/persistent_calendar_notif_logs.json");
const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));

// Get the last batch by the most recent timestamp
if (logs.length === 0) {
  console.log("No logs found.");
  process.exit(0);
}

const latestTimestamp = logs[logs.length - 1].sent_at;
const latestDateStr = latestTimestamp ? latestTimestamp.substring(0, 16) : "";

// Filter logs from the last 2 hours
const recentLogs = logs.filter(l => l.sent_at && l.sent_at.startsWith("2026-10-28"));

const sent = recentLogs.filter(l => l.status === "SENT");
const failed = recentLogs.filter(l => l.status === "FAILED");

console.log("=== RECENT NOTIFICATION DISPATCH AUDIT (2026-10-28) ===");
console.log("Total Dispatched in recent run:", recentLogs.length);
console.log("Successfully Delivered (SENT)  :", sent.length);
console.log("Failed (FAILED)                :", failed.length);

const failureReasons = {};
failed.forEach(f => {
  const shortMsg = (f.failure_reason || "Unknown").split("\n")[0];
  failureReasons[shortMsg] = (failureReasons[shortMsg] || 0) + 1;
});

console.log("\nFailure Breakdown:");
console.log(JSON.stringify(failureReasons, null, 2));

console.log("\nFirst 5 Successful Recipients:");
sent.slice(0, 5).forEach(s => console.log(` - ${s.user_email}`));

console.log("\nFirst 5 Failed Recipients:");
failed.slice(0, 5).forEach(f => console.log(` - ${f.user_email}`));
