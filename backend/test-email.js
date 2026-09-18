require("dotenv").config();
const { sendEmail } = require("./src/services/notification.service.js");

const testRecipient = process.argv[2];

if (!testRecipient) {
  console.error("Usage: node test-email.js your-email@gmail.com");
  process.exit(1);
}

sendEmail(testRecipient, "Test email from AI Examination System", "If you're reading this, Nodemailer is working correctly.")
  .then(() => {
    console.log(`✅ Email send attempted to ${testRecipient}. Check inbox (and spam folder).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  });