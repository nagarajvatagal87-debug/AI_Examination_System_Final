const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.js");
const studentRoutes = require("./routes/student.js");
const facultyRoutes = require("./routes/faculty.js");
const hodRoutes = require("./routes/hod.js");
const principalRoutes = require("./routes/principal.js");
const courseMaterialRoutes = require("./routes/courseMaterial.js");
const examRoutes = require("./routes/exam.js");
const answerRoutes = require("./routes/answer.js");
const evaluationRoutes = require("./routes/evaluation.js");
const chatRoutes = require("./routes/chat.js");
const notificationRoutes = require("./routes/notifications.js");
const inviteRoutes = require("./routes/invites.js");
const subjectRoutes = require("./routes/subjects.js");
const complaintRoutes = require("./routes/complaint.js");
const messageRoutes = require("./routes/messages.js");
const publicRoutes = require("./routes/public.js");
const examdeptRoutes = require("./routes/examdept.js");
const profileRoutes = require("./routes/profile.js");
const academicCalendarRoutes = require("./routes/academicCalendar.js");
const sportsRoutes = require("./routes/sports.js");
const clubRoutes = require("./routes/clubs.js");
const { seedDepartments } = require("./services/departmentSeeder.js");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", service: "ai-examination-backend" }));

app.use("/api/clubs", clubRoutes);
app.use("/api/sports", sportsRoutes);
app.use("/api/academic-calendar", academicCalendarRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/course-materials", courseMaterialRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/examdept", examdeptRoutes);
app.use("/api/profile", profileRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Backend API running on http://127.0.0.1:${PORT}`);
  await seedDepartments();
});