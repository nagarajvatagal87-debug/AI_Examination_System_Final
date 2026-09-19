const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

async function testAnswerUpload() {
  console.log("=== TESTING ANSWER SHEET PDF UPLOAD & EVALUATION ===");

  // 1. Get an existing exam and student
  const { data: exam } = await supabaseAdmin.from("exams").select("id, subject_id").limit(1).single();
  const { data: student } = await supabaseAdmin.from("profiles").select("id, full_name").eq("role", "student").limit(1).single();
  const { data: faculty } = await supabaseAdmin.from("profiles").select("id").eq("role", "faculty").limit(1).single();

  if (!exam || !student || !faculty) {
    console.log("Missing test data in DB (exam/student/faculty)");
    return;
  }

  // Create sample dummy PDF buffer
  const pdfBuffer = Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length 80>>stream\nBT /F1 12 Tf 40 700 TD (DSATM Student Handwritten Answer Test PDF Document) ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n00000000101 00000 n\n0000000220 00000 n\n0000000287 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n418\n%%EOF`
  );

  const FormData = require("form-data");
  const form = new FormData();
  form.append("file", pdfBuffer, { filename: "Test_Answer_Sheet.pdf", contentType: "application/pdf" });

  const testEmail = `faculty_eval_${Date.now()}@college.edu`;
  await fetch("http://localhost:4000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "Password123!", fullName: "Prof. Vision Tester", role: "faculty" }),
  });

  const loginRes = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "Password123!" }),
  }).then((r) => r.json());

  const token = loginRes.token;

  console.log("Submitting test answer PDF upload to server...");
  const uploadRes = await fetch(`http://localhost:4000/api/faculty/exams/${exam.id}/students/${student.id}/answer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  }).then((r) => r.json());

  console.log("Upload Response:", uploadRes);

  if (uploadRes?.id) {
    console.log("✓ Answer submission created successfully! ID:", uploadRes.id);

    // Fetch evaluations for this submission
    const evalsRes = await fetch(`http://localhost:4000/api/faculty/submissions/${uploadRes.id}/evaluations`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    console.log(`✓ Generated ${evalsRes?.length || 0} question evaluation slots!`);

    // Fetch PDF preview URL
    const fileRes = await fetch(`http://localhost:4000/api/faculty/submissions/${uploadRes.id}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    console.log(`✓ PDF Preview URL generated! Starts with:`, fileRes?.url?.slice(0, 40));
  } else {
    console.error("❌ Upload response failed!");
  }
}

testAnswerUpload().catch((e) => console.error("Test error:", e.message));
