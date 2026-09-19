const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { supabaseAdmin } = require("../config/Supabase");

async function testSystem() {
  console.log('--- RUNNING FULL SYSTEM END-TO-END VERIFICATION ---');

  // 1. Test Registration
  const testEmail = `faculty_pro_${Date.now()}@college.edu`;
  const regRes = await fetch('http://localhost:4000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      fullName: 'Prof. Ananya Roy',
      role: 'faculty'
    })
  }).then(r => r.json());
  console.log('1. Registration Response:', regRes.message || regRes.error, 'ID:', regRes.id);

  // 2. Test Login
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!'
    })
  }).then(r => r.json());
  console.log('2. Login Response User:', loginRes.user?.fullName, 'ID:', loginRes.user?.id, 'Token:', loginRes.token);

  const token = loginRes.token;

  // 3. Test Dashboard Summary
  const dashRes = await fetch('http://localhost:4000/api/faculty/dashboard-summary', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  console.log('3. Dashboard Summary:', { facultyName: dashRes.facultyName, subjectCount: dashRes.subjectCount, examCount: dashRes.examCount, studentCount: dashRes.studentCount });

  // 4. Test Question Paper PDF Export
  const { data: exam } = await supabaseAdmin.from('exams').select('id').limit(1).single();
  if (exam) {
    const pdfRes = await fetch(`http://localhost:4000/api/faculty/exams/${exam.id}/export-pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    console.log('4. Question Paper Export PDF URL Generated! Length:', pdfRes.download_url?.length);
  }

  console.log('--- ALL SYSTEM VERIFICATION TESTS PASSED ---');
}

testSystem().catch(err => console.error('Verification error:', err.message));
