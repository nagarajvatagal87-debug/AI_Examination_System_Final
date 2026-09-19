const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { supabaseAdmin } = require('../config/Supabase');

async function seed() {
  console.log('--- SEEDING FACULTY FLOW DATA ---');

  // 1. Get or Create Faculty Profile
  let { data: faculty } = await supabaseAdmin.from('profiles').select('*').eq('role', 'faculty').limit(1).maybeSingle();
  if (!faculty) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
        email: 'faculty_demo@college.edu', password: 'Password123!', email_confirm: true
      });
      if (authUser?.user) {
        const { data: newFac } = await supabaseAdmin.from('profiles').insert({
          id: authUser.user.id, role: 'faculty', full_name: 'Dr. Ramesh Kumar', email: 'faculty_demo@college.edu'
        }).select().single();
        faculty = newFac;
      }
    } catch (e) {}
  }
  if (!faculty) {
    const { data: anyFac } = await supabaseAdmin.from('profiles').select('*').eq('role', 'faculty').limit(1).maybeSingle();
    faculty = anyFac;
  }
  console.log('Faculty:', faculty?.full_name, faculty?.id);

  // 2. Get or Create Department
  let { data: dept } = await supabaseAdmin.from('departments').select('*').limit(1).maybeSingle();
  let deptId = dept?.id;
  if (!deptId) {
    const { data: newDept } = await supabaseAdmin.from('departments').insert({
      name: 'Computer Applications', code: 'MCA'
    }).select().single();
    deptId = newDept?.id;
  }
  console.log('Department ID:', deptId);

  // 3. Create/Ensure Subject
  let { data: subject } = await supabaseAdmin.from('subjects').select('*').eq('name', 'Database Management Systems').maybeSingle();
  if (!subject) {
    const { data: newSub } = await supabaseAdmin.from('subjects').insert({
      name: 'Database Management Systems', code: 'DBMS101', faculty_id: faculty?.id, department_id: deptId
    }).select().single();
    subject = newSub;
  } else if (faculty?.id) {
    await supabaseAdmin.from('subjects').update({ faculty_id: faculty.id, department_id: deptId }).eq('id', subject.id);
  }
  console.log('Subject:', subject?.name, subject?.id);

  // 4. Create Students if needed
  const demoStudents = [
    { registration_no: 'MCA001', full_name: 'Ameer Nagarasi', email: 'ameer_test@college.edu' },
    { registration_no: 'MCA002', full_name: 'Prajwal Kumar', email: 'prajwal_test@college.edu' },
    { registration_no: 'MCA003', full_name: 'Rohan Verma', email: 'rohan_test@college.edu' }
  ];

  const studentRecords = [];
  for (const s of demoStudents) {
    let { data: st } = await supabaseAdmin.from('profiles').select('*').eq('registration_no', s.registration_no).maybeSingle();
    if (!st) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
          email: s.email, password: 'Password123!', email_confirm: true
        });
        if (authUser?.user) {
          const { data: newSt } = await supabaseAdmin.from('profiles').insert({
            id: authUser.user.id, role: 'student', full_name: s.full_name, registration_no: s.registration_no, email: s.email, department_id: deptId
          }).select().single();
          st = newSt;
        }
      } catch (err) {}
    }
    if (st) studentRecords.push(st);
  }

  // If no auth students created, fetch existing students from profiles table
  if (studentRecords.length === 0) {
    const { data: existingStudents } = await supabaseAdmin.from('profiles').select('*').eq('role', 'student').limit(5);
    if (existingStudents && existingStudents.length > 0) {
      studentRecords.push(...existingStudents);
    }
  }

  console.log('Students count:', studentRecords.length);

  // 5. Create Exam
  let { data: exam } = await supabaseAdmin.from('exams').select('*').eq('title', 'DBMS Mid-Term Exam').maybeSingle();
  if (!exam) {
    const { data: newExam } = await supabaseAdmin.from('exams').insert({
      subject_id: subject.id, type: 'internal-1', title: 'DBMS Mid-Term Exam', total_marks: 50, status: 'evaluation', created_by: faculty?.id
    }).select().single();
    exam = newExam;
  }
  console.log('Exam:', exam?.title, exam?.id);

  // 6. Create Questions
  const questionsData = [
    { question_no: 1, question_text: 'Define Database Management System (DBMS) and list 3 primary advantages over traditional file processing systems.', marks: 10, unit: 'Unit 1', difficulty: 'easy' },
    { question_no: 2, question_text: 'Explain the 3-Schema Architecture with a neat diagram.', marks: 10, unit: 'Unit 1', difficulty: 'medium' },
    { question_no: 3, question_text: 'What is Normalization? Explain 1NF, 2NF, and 3NF with suitable SQL tables.', marks: 10, unit: 'Unit 2', difficulty: 'medium' },
    { question_no: 4, question_text: 'Explain ACID properties in transaction management.', marks: 10, unit: 'Unit 3', difficulty: 'easy' },
    { question_no: 5, question_text: 'Write SQL queries for INNER JOIN, LEFT JOIN, and GROUP BY with HAVING clause.', marks: 10, unit: 'Unit 4', difficulty: 'hard' }
  ];

  const questionRecords = [];
  for (const q of questionsData) {
    let { data: qRec } = await supabaseAdmin.from('questions').select('*').eq('exam_id', exam.id).eq('question_no', q.question_no).maybeSingle();
    if (!qRec) {
      const { data: newQ } = await supabaseAdmin.from('questions').insert({ ...q, exam_id: exam.id, rubric: { key_points: ['Definition', 'Diagram', 'Examples'] } }).select().single();
      qRec = newQ;
    }
    if (qRec) questionRecords.push(qRec);
  }
  console.log('Questions count:', questionRecords.length);

  // 7. Create Submissions & AI Evaluations
  for (const st of studentRecords) {
    let { data: sub } = await supabaseAdmin.from('answer_submissions').select('*').eq('exam_id', exam.id).eq('student_id', st.id).maybeSingle();
    if (!sub) {
      const { data: newSub } = await supabaseAdmin.from('answer_submissions').insert({
        exam_id: exam.id, student_id: st.id, scanned_file_path: `answers/${exam.id}/${st.id}-sample.pdf`, status: 'evaluated', uploaded_by: faculty?.id
      }).select().single();
      sub = newSub;
    }

    if (!sub) continue;

    for (const q of questionRecords) {
      let { data: ans } = await supabaseAdmin.from('answers').select('*').eq('submission_id', sub.id).eq('question_id', q.id).maybeSingle();
      if (!ans) {
        const { data: newAns } = await supabaseAdmin.from('answers').insert({
          submission_id: sub.id, question_id: q.id, ocr_text: `Student answer for Q${q.question_no} (${st.full_name}): Comprehensive explanation with key points and diagram.`, ocr_confidence: 0.94
        }).select().single();
        ans = newAns;
      }

      if (!ans) continue;

      let { data: ev } = await supabaseAdmin.from('evaluations').select('*').eq('answer_id', ans.id).maybeSingle();
      if (!ev) {
        const aiMarks = Math.floor(q.marks * 0.8) + (st.registration_no === 'MCA001' ? 1 : 0);
        await supabaseAdmin.from('evaluations').insert({
          answer_id: ans.id, ai_suggested_marks: aiMarks, ai_confidence: 0.9, ai_evidence: 'Matches rubric criteria correctly.', final_marks: null, published: false
        });
      }
    }
  }

  console.log('--- SEEDING COMPLETE! FACULTY FLOW READY ---');
}

seed().catch(err => console.error(err));
