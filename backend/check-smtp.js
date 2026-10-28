const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 1,
  maxMessages: 200,
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("VERIFY_FAILED:", err.message);
  } else {
    console.log("VERIFY_SUCCESS: SMTP credentials and connection are ACTIVE and READY!");
  }
  process.exit(0);
});
