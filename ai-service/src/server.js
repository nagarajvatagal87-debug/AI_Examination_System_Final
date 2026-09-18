require("dotenv").config();
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
const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", service: "ai-examination-backend" }));

// Routes must be mounted BEFORE the 404 fallback
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
// 404 fallback — always last
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});