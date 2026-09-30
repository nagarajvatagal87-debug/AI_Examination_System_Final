import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import LmsPdfViewerModal from '../../components/LmsPdfViewerModal.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'
import AcademicProfileTab from './AcademicProfileTab.jsx'
import AcademicReportsTab from './AcademicReportsTab.jsx'
import './StudentDashboard.css'

function SafeMarkdown({ content }) {
  const str = String(content || '')
  if (!str) return null
  try {
    return <div className="markdown-content"><ReactMarkdown>{str}</ReactMarkdown></div>
  } catch (e) {
    return <div className="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>{str}</div>
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [activePdfModal, setActivePdfModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Complaint form state
  const [complaintQuestion, setComplaintQuestion] = useState('')
  const [complaintReason, setComplaintReason] = useState('')
  const [complaintSuccess, setComplaintSuccess] = useState('')
  const [dbComplaints, setDbComplaints] = useState([])

  const [dbSubjects, setDbSubjects] = useState([])
  const [dbMarks, setDbMarks] = useState([])
  const [dbMaterials, setDbMaterials] = useState([])
  const [dbExams, setDbExams] = useState([])
  const [studentInternals, setStudentInternals] = useState([])
  const [mainResults, setMainResults] = useState([])
  const [savedBookmarks, setSavedBookmarks] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [practiceScores, setPracticeScores] = useState([])
  const [attendanceData, setAttendanceData] = useState(null)
  const [internalTimetable, setInternalTimetable] = useState(null)

  useEffect(() => {
    // 1. Profile
    api.get('/profile')
      .then((res) => { if (res.data) setUserProfile(res.data) })
      .catch(() => {})

    // 2. Subjects
    api.get('/student/subjects')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setDbSubjects(res.data)
          if (res.data.length > 0 && !selectedSubject) {
            setSelectedSubject(res.data[0].id)
          }
        }
      })
      .catch(() => {})

    // 3. Evaluations / Dashboard
    api.get('/student/dashboard')
      .then((res) => { if (res.data?.marks) setDbMarks(res.data.marks) })
      .catch(() => {})

    // 4. Complaints
    api.get('/student/complaints')
      .then((res) => { if (Array.isArray(res.data)) setDbComplaints(res.data) })
      .catch(() => {})

    // 5. Course Materials
    api.get('/student/materials')
      .then((res) => { if (Array.isArray(res.data)) setDbMaterials(res.data) })
      .catch(() => {})

    // 6. Internal Marks (50M)
    api.get('/student/internal-marks')
      .then((res) => { if (Array.isArray(res.data)) setStudentInternals(res.data) })
      .catch(() => {})

    // 7. Main Exam Results
    api.get('/student/main-results')
      .then((res) => { if (Array.isArray(res.data)) setMainResults(res.data) })
      .catch(() => {})

    // 8. Attendance
    api.get('/student/attendance')
      .then((res) => { if (res.data) setAttendanceData(res.data) })
      .catch(() => {})

    // 9. Internal Timetable
    api.get('/student/internal-timetable')
      .then((res) => { if (res.data) setInternalTimetable(res.data) })
      .catch(() => {})

    // 10. DB Scheduled Examinations
    api.get('/student/examinations')
      .then((res) => { if (Array.isArray(res.data)) setDbExams(res.data) })
      .catch(() => {})

    // 11. Bookmarks from DB API
    api.get('/student/bookmarks')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setSavedBookmarks(res.data)
        } else {
          try { setSavedBookmarks(JSON.parse(localStorage.getItem('student_bookmarks') || '[]')) } catch (e) {}
        }
      })
      .catch(() => {
        try { setSavedBookmarks(JSON.parse(localStorage.getItem('student_bookmarks') || '[]')) } catch (e) {}
      })

    // 12. Practice History from DB API
    api.get('/student/practice-history')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setPracticeScores(res.data)
        } else {
          try { setPracticeScores(JSON.parse(localStorage.getItem('student_practice_scores') || '[]')) } catch (e) {}
        }
      })
      .catch(() => {
        try { setPracticeScores(JSON.parse(localStorage.getItem('student_practice_scores') || '[]')) } catch (e) {}
      })
  }, [])

  const safeDbSubjects = Array.isArray(dbSubjects) ? dbSubjects : []
  const safeStudentInternals = Array.isArray(studentInternals) ? studentInternals : []
  const safeDbMaterials = Array.isArray(dbMaterials) ? dbMaterials : []
  const safeMainResults = Array.isArray(mainResults) ? mainResults : []
  const safeDbMarks = Array.isArray(dbMarks) ? dbMarks : []
  const safeDbExams = Array.isArray(dbExams) ? dbExams : []

  const subjects = safeDbSubjects.map((s, idx) => {
    const sIdStr = String(s?.id || `sub-${idx + 1}`)
    const internalRec = safeStudentInternals.find((i) => String(i?.subject_id) === sIdStr)
    const tot = internalRec
      ? (internalRec.total_internal_marks ?? ((internalRec.internal1_marks || 0) + (internalRec.internal2_marks || 0) + (internalRec.assignment_marks || 0) + (internalRec.project_marks || 0)))
      : 0
    const progressVal = internalRec ? Math.min(100, Math.round((tot / 50) * 100)) : 0
    return {
      id: s?.id || `sub-${idx + 1}`,
      name: s?.name || 'Subject',
      fullName: s?.name || 'Subject',
      code: s?.code || `SUB-${sIdStr.slice(0, 4).toUpperCase()}`,
      facultyName: s?.profiles?.full_name || 'Faculty Assigned',
      icon: idx % 4 === 0 ? '📗' : idx % 4 === 1 ? '📙' : idx % 4 === 2 ? '📕' : '📘',
      progress: progressVal,
      color: idx % 4 === 0 ? '#10b981' : idx % 4 === 1 ? '#f59e0b' : idx % 4 === 2 ? '#f43f5e' : '#3b82f6',
    }
  })

  const currentSubjectObj = subjects.find((s) => String(s.id) === String(selectedSubject)) || subjects[0] || null

  // Filter materials based on search or selected subject
  const displayedMaterials = safeDbMaterials.filter((m) => {
    if (searchQuery.trim()) {
      return (m?.title || m?.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    }
    return !selectedSubject || String(m?.subject_id) === String(selectedSubject)
  })

  // Dynamic Recent Updates derived strictly from DB data
  const recentUpdatesList = []
  safeDbMaterials.forEach((m) => {
    if (m) {
      recentUpdatesList.push({
        id: `mat-${m.id || Math.random()}`,
        icon: '📄',
        colorClass: 'blue',
        title: 'New Course Material Uploaded',
        desc: `${m.subjects?.name || 'Subject'}: ${m.title || m.file_name || 'Material'}`,
        time: m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Recently',
      })
    }
  })
  safeStudentInternals.forEach((i) => {
    if (i) {
      const tot = i.total_internal_marks ?? ((i.internal1_marks || 0) + (i.internal2_marks || 0) + (i.assignment_marks || 0) + (i.project_marks || 0))
      const matchedSub = safeDbSubjects.find((s) => String(s.id) === String(i.subject_id))
      const subName = (i.subjects?.name && i.subjects?.name !== 'Subject') ? i.subjects.name : (matchedSub?.name || 'Deep Learning')
      recentUpdatesList.push({
        id: `int-${i.subject_id || Math.random()}`,
        icon: '📊',
        colorClass: 'green',
        title: '50-Mark Internal Assessment',
        desc: `${subName}: ${tot} / 50 Marks (${i.status === 'approved_by_hod' ? '✓ HOD Approved' : 'Faculty Entered'})`,
        time: 'Recently',
      })
    }
  })
  safeMainResults.forEach((r) => {
    if (r) {
      recentUpdatesList.push({
        id: `res-${r.id || Math.random()}`,
        icon: '🏆',
        colorClass: 'purple',
        title: 'Main Examination Result',
        desc: `${r.exams?.subjects?.name || r.exams?.title || 'Exam'}: ${r.total_marks || 0}/${r.max_marks || 100} (${r.passed ? 'PASSED' : 'FAILED'})`,
        time: r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Recently',
      })
    }
  })

  const studentResults = safeDbMarks.map((m, idx) => ({
    exam: m?.answers?.questions?.exams?.title || 'Course Exam',
    type: m?.answers?.questions?.exams?.type || 'Internal',
    qNo: m?.answers?.questions?.question_no ? `Q${m.answers.questions.question_no}` : `Q${idx + 1}`,
    question: m?.answers?.questions?.question_text || 'Subject question',
    maxMarks: m?.answers?.questions?.marks || 10,
    aiScore: m?.ai_suggested_marks || 0,
    teacherScore: m?.final_marks !== null && m?.final_marks !== undefined ? m.final_marks : (m?.ai_suggested_marks || 0),
    verified: m?.final_marks !== null && m?.final_marks !== undefined,
    feedback: m?.ai_evidence?.evidence || 'Answers evaluated successfully.',
  }))

  const complaintOptions = []
  studentResults.forEach((r, idx) => {
    complaintOptions.push({
      id: r.evaluationId || `eval-q-${idx + 1}`,
      label: `${r.exam} (${r.qNo}): ${r.question} — Score: ${r.teacherScore}/${r.maxMarks}`,
      questionTitle: `${r.exam} (${r.qNo}): ${r.question}`,
      subjectName: currentSubjectObj?.fullName || 'Deep Learning',
      subjectCode: currentSubjectObj?.code || 'MMC321',
      currentMarks: r.teacherScore,
      maxMarks: r.maxMarks,
      aiScore: r.aiScore,
    })
  })

  safeStudentInternals.forEach((i) => {
    const tot = i.total_internal_marks ?? ((i.internal1_marks || 0) + (i.internal2_marks || 0) + (i.assignment_marks || 0) + (i.project_marks || 0))
    const matchedSub = safeDbSubjects.find((s) => String(s.id) === String(i.subject_id))
    const subName = (i.subjects?.name && i.subjects?.name !== 'Subject') ? i.subjects.name : (matchedSub?.name || 'Deep Learning')
    const subCode = (i.subjects?.code && i.subjects?.code !== 'SUB') ? i.subjects.code : (matchedSub?.code || 'MMC321')
    complaintOptions.push({
      id: `eval-int-${i.subject_id}`,
      label: `${subName} (${subCode}) 50-Mark Continuous Assessment — Score: ${tot}/50`,
      questionTitle: `${subName} 50-Mark Continuous Assessment`,
      subjectName: subName,
      subjectCode: subCode,
      currentMarks: tot,
      maxMarks: 50,
      aiScore: tot,
    })
  })

  async function handleSubmitComplaint(e) {
    e.preventDefault()
    if (!complaintReason.trim()) return

    const selectedOpt = complaintOptions.find((o) => o.id === complaintQuestion) || complaintOptions[0] || {
      id: `eval-${Date.now()}`,
      questionTitle: complaintQuestion || 'Internal Exam Assessment',
      subjectName: currentSubjectObj?.fullName || 'Subject',
      subjectCode: currentSubjectObj?.code || 'SUB',
      currentMarks: 0,
      maxMarks: 50,
      aiScore: 0,
    }

    try {
      const res = await api.post('/student/complaints', {
        evaluationId: selectedOpt.id,
        questionTitle: selectedOpt.questionTitle || complaintQuestion,
        subjectName: selectedOpt.subjectName,
        subjectCode: selectedOpt.subjectCode,
        currentMarks: selectedOpt.currentMarks,
        maxMarks: selectedOpt.maxMarks,
        aiScore: selectedOpt.aiScore,
        reason: complaintReason,
      })
      if (res.data) {
        setDbComplaints([res.data, ...dbComplaints])
      }
      setComplaintReason('')
      setComplaintSuccess('✓ Internal mark complaint submitted! Faculty has been notified.')
      setTimeout(() => setComplaintSuccess(''), 5000)
    } catch (err) {
      setComplaintSuccess('⚠️ Failed to submit complaint. Please try again.')
      setTimeout(() => setComplaintSuccess(''), 4000)
    }
  }

  function handleOpenAiAssistant(materialObj, initialSubTab = 'course-materials') {
    const mat = materialObj ? { ...materialObj } : (safeDbMaterials[0] ? { ...safeDbMaterials[0] } : (
      currentSubjectObj ? {
        id: `mat-${currentSubjectObj.id}`,
        title: `${currentSubjectObj.fullName} Course Notes.pdf`,
        file_name: `${currentSubjectObj.code}_Notes.pdf`,
        subject_id: currentSubjectObj.id,
        subjects: { name: currentSubjectObj.fullName, code: currentSubjectObj.code }
      } : null
    ))
    if (!mat) return
    mat.initialTab = initialSubTab || 'course-materials'
    setActivePdfModal(mat)
  }

  async function handleSaveBookmarkGlobal(subjectName, title, text) {
    try {
      const res = await api.post('/student/bookmarks', {
        subject: subjectName || currentSubjectObj?.fullName || 'General',
        title: title || 'Saved Concept',
        content: text,
      })
      if (res.data) {
        setSavedBookmarks([res.data, ...savedBookmarks])
      }
    } catch (e) {
      const newBm = {
        id: `bm-${Date.now()}`,
        subject: subjectName || currentSubjectObj?.fullName || 'General',
        title: title || 'Saved Concept',
        content: text,
        date: new Date().toLocaleDateString(),
      }
      const updated = [newBm, ...savedBookmarks]
      localStorage.setItem('student_bookmarks', JSON.stringify(updated))
      setSavedBookmarks(updated)
    }
  }

  const totalSubjectsCount = subjects.length
  const upcomingExamsCount = safeDbExams.filter((e) => new Date(e.date) >= new Date()).length
  const totalResultsPublished = safeStudentInternals.filter((i) => i?.status === 'approved_by_hod').length + safeMainResults.length
  const overallProgressVal = safeStudentInternals.length > 0
    ? Math.round(
        (safeStudentInternals.reduce((acc, i) => acc + (i?.total_internal_marks ?? ((i?.internal1_marks || 0) + (i?.internal2_marks || 0) + (i?.assignment_marks || 0) + (i?.project_marks || 0))), 0) /
          (safeStudentInternals.length * 50)) *
          100
      )
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="eduexam-shell" style={{ flex: 1 }}>
        {/* EduExam DSATM Student Sidebar */}
        <aside className="eduexam-sidebar">
          <div className="eduexam-brand">
            <div className="eduexam-logo-frame">
              <img src="/dsi-logo.png" alt="DSI Logo" className="eduexam-logo-img" />
            </div>
            <div>
              <div className="eduexam-brand-name">🎓 DSATM</div>
              <div className="eduexam-brand-sub">Student Portal</div>
            </div>
          </div>

          <nav className="eduexam-nav">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">🏠</span> Dashboard
            </button>
            <button
              className={`nav-btn ${activeTab === 'subjects' ? 'active' : ''}`}
              onClick={() => setActiveTab('subjects')}
            >
              <span className="nav-icon">📚</span> My Subjects
            </button>
            <button
              className={`nav-btn ${activeTab === 'examinations' ? 'active' : ''}`}
              onClick={() => setActiveTab('examinations')}
            >
              <span className="nav-icon">📝</span> Examinations
            </button>
            <button
              className={`nav-btn ${activeTab === 'hall-ticket' ? 'active' : ''}`}
              onClick={() => setActiveTab('hall-ticket')}
            >
              <span className="nav-icon">🎫</span> Hall Ticket
            </button>
            <button
              className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <span className="nav-icon">📄</span> Course Materials
            </button>
            <button
              className={`nav-btn ${activeTab === 'ai-study' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-study')}
            >
              <span className="nav-icon">🤖</span> AI Study Assistant
            </button>
            <button
              className={`nav-btn ${activeTab === 'practice' ? 'active' : ''}`}
              onClick={() => setActiveTab('practice')}
            >
              <span className="nav-icon">🧪</span> Practice Tests
            </button>
            <button
              className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              <span className="nav-icon">📊</span> Results
            </button>
            {/* NEW REQUIRED STUDENT MODULE: Academic Reports */}
            <button
              className={`nav-btn ${activeTab === 'academic-reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic-reports')}
            >
              <span className="nav-icon">📑</span> Academic Reports
            </button>
            {/* NEW REQUIRED STUDENT MODULE: Academic Profile */}
            <button
              className={`nav-btn ${activeTab === 'academic-profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic-profile')}
            >
              <span className="nav-icon">🎓</span> Academic Profile
            </button>
            <button
              className={`nav-btn ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <span className="nav-icon">📈</span> My Performance
            </button>
            <button
              className={`nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <span className="nav-icon">📅</span> Attendance
            </button>
            <button
              className={`nav-btn ${activeTab === 'academic-calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('academic-calendar')}
            >
              <span className="nav-icon">🗓️</span> Academic Calendar
            </button>
            <button
              className={`nav-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              <span className="nav-icon">🔖</span> Bookmarks
            </button>
            <button
              className={`nav-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <span className="nav-icon">💬</span> Complaints
            </button>
            <button
              className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="nav-icon">🔔</span> Notifications
            </button>
            <button
              className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="nav-icon">👤</span> Profile
            </button>
            <button
              className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="nav-icon">⚙️</span> Settings
            </button>
          </nav>

          <button className="eduexam-logout-btn" onClick={logout}>
            🚪 Logout
          </button>
        </aside>

        {/* Main Area */}
        <div className="eduexam-main-area">
          {/* Top Header Bar */}
          <header className="eduexam-top-header">
            <div className="search-bar-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search subjects, materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="top-header-center">
              <h1 className="header-college-title-center">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
              <p className="header-dashboard-subtitle-center">🎓 Student Dashboard</p>
            </div>

            <div className="top-header-right">
              <NotificationBell count={0} />
              <div className="header-icon-btn" onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }} title="Settings">⚙️</div>

              <div className="user-profile-badge" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
                <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                  {userProfile?.avatar_url || user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar') ? (
                    <img src={userProfile?.avatar_url || user?.avatarUrl || user?.avatar_url || localStorage.getItem('user_avatar')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (userProfile?.full_name?.[0] || user?.fullName?.[0] || 'S')
                  )}
                </div>
                <div>
                  <div className="user-name-title">{userProfile?.full_name || user?.fullName || 'Student Candidate'}</div>
                  <div className="user-sub-title">{userProfile?.departments?.name || userProfile?.department_name || user?.departmentName || 'MCA'} · Student</div>
                </div>
                <span className="caret-down">▾</span>
              </div>
            </div>
          </header>

          {/* Dynamic Workspace Content */}
          <main className="eduexam-content-body">
            {/* Tab 1: Dashboard */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Banner Greeting */}
                <div className="greeting-banner-flex">
                  <div>
                    <h1 className="greeting-title">Good Day, {userProfile?.full_name || user?.fullName || 'Student'}! 🖐️</h1>
                    <p className="greeting-sub">Keep Learning, Keep Growing!</p>
                  </div>
                  <div className="motivation-quote-box">
                    "A little progress each day adds up to big results."
                  </div>
                </div>

                {/* Stat Cards strictly derived from Database */}
                <div className="dashboard-stats-grid">
                  <div className="stat-box blue">
                    <div className="stat-icon-square">📘</div>
                    <div>
                      <div className="stat-number">{totalSubjectsCount}</div>
                      <div className="stat-label">My Subjects</div>
                    </div>
                  </div>

                  <div className="stat-box purple">
                    <div className="stat-icon-square">📋</div>
                    <div>
                      <div className="stat-number">{upcomingExamsCount}</div>
                      <div className="stat-label">Upcoming Exams</div>
                    </div>
                  </div>

                  <div className="stat-box green">
                    <div className="stat-icon-square">📊</div>
                    <div>
                      <div className="stat-number">{totalResultsPublished}</div>
                      <div className="stat-label">Results Published</div>
                    </div>
                  </div>

                  <div className="stat-box progress-box">
                    <div>
                      <div className="stat-number">{overallProgressVal > 0 ? `${overallProgressVal}%` : 'N/A'}</div>
                      <div className="stat-label">Academic Progress</div>
                    </div>
                    <div className="progress-donut-mini">
                      <svg width="44" height="44" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                        <path strokeDasharray={`${overallProgressVal}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Dashboard Split Sections */}
                <div className="dashboard-three-split">
                  {/* Recent Updates */}
                  <div className="content-card">
                    <div className="card-header-line">
                      <h3>Recent Updates</h3>
                    </div>

                    {recentUpdatesList.length === 0 ? (
                      <div style={{ padding: '24px 16px', color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                        No notifications available yet.
                      </div>
                    ) : (
                      <div className="updates-list">
                        {recentUpdatesList.slice(0, 5).map((upd) => (
                          <div key={upd.id} className="update-item">
                            <div className={`update-icon-circle ${upd.colorClass}`}>{upd.icon}</div>
                            <div>
                              <div className="update-title">{upd.title}</div>
                              <div className="update-desc">{upd.desc}</div>
                              <div className="update-time">{upd.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* My Subjects List */}
                  <div className="content-card">
                    <div className="card-header-line">
                      <h3>My Subjects</h3>
                      {subjects.length > 0 && (
                        <span className="view-all-link" onClick={() => setActiveTab('subjects')}>View All</span>
                      )}
                    </div>

                    {subjects.length === 0 ? (
                      <div style={{ padding: '24px 16px', color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                        No subjects are currently assigned to you.
                      </div>
                    ) : (
                      <div className="my-subjects-grid">
                        {subjects.map((s) => (
                          <div
                            key={s.id}
                            className="sub-card-box"
                            onClick={() => {
                              setSelectedSubject(s.id)
                              setActiveTab('subjects')
                            }}
                          >
                            <div className="sub-header-row">
                              <span className="sub-icon-lbl">{s.icon} {s.name}</span>
                              <span className="sub-percent-val" style={{ color: s.color }}>{s.progress}% Complete</span>
                            </div>
                            <div className="sub-bar-track">
                              <div className="sub-bar-fill" style={{ width: `${s.progress}%`, background: s.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Panel AI Promo */}
                  <div className="right-panel-column">
                    <div className="ai-assistant-promo-card">
                      <div className="robot-avatar-icon">🤖</div>
                      <h4>AI Study Assistant</h4>
                      <p>Ask questions directly grounded on your course materials</p>
                      <button className="open-ai-btn" onClick={() => setActiveTab('ai-study')}>
                        Open AI Assistant
                      </button>
                    </div>

                    <div className="motivation-card">
                      <div className="mot-title">Today's Motivation</div>
                      <p className="mot-text">
                        "Discipline today creates opportunities tomorrow."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: My Subjects Detail */}
            {activeTab === 'subjects' && (
              <div className="content-card">
                {subjects.length === 0 ? (
                  <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8' }}>
                    No subjects are currently assigned to you.
                  </div>
                ) : (
                  <>
                    <div className="card-header-line">
                      <h2>{currentSubjectObj?.icon || '📚'} {currentSubjectObj?.fullName}</h2>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="subject-dropdown-select"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.code})</option>
                        ))}
                      </select>
                    </div>
                    <p className="sub-detail-desc">
                      Course Code: {currentSubjectObj?.code} · Faculty: {currentSubjectObj?.facultyName}
                    </p>

                    {/* Course Progress Bar */}
                    <div style={{ margin: '14px 0 20px 0', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Course Syllabus Completion</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: currentSubjectObj?.color || '#2563eb' }}>
                          {currentSubjectObj?.progress || 0}% Complete
                        </span>
                      </div>
                      <div className="sub-bar-track" style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                        <div className="sub-bar-fill" style={{ width: `${currentSubjectObj?.progress || 0}%`, background: currentSubjectObj?.color || '#2563eb', height: '100%', borderRadius: 5, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    <h4 style={{ margin: '20px 0 12px 0', fontSize: 16 }}>Published Course Materials</h4>
                    {displayedMaterials.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                        No course materials published for this subject yet.
                      </div>
                    ) : (
                      displayedMaterials.map((m) => (
                        <div key={m.id} className="material-item-card">
                          <div>
                            <div className="mat-tag">{m.subjects?.name || currentSubjectObj?.name} · PDF Document</div>
                            <h4 className="mat-title">{m.title || m.file_name}</h4>
                          </div>
                          <button className="open-pdf-btn" onClick={() => handleOpenAiAssistant(m)}>
                            📖 Open PDF & Ask AI
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Examinations */}
            {activeTab === 'examinations' && (
              <div className="content-card">
                <div className="card-header-line" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>📅 Official Internal Examination Timetable & Eligibility</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      HOD Published Internal Assessment Schedule & Attendance Eligibility Verification.
                    </p>
                  </div>
                  <button className="fd-btn" onClick={() => setActiveTab('hall-ticket')}>
                    🎫 View Hall Ticket
                  </button>
                </div>

                {/* Attendance Eligibility Banner */}
                {internalTimetable && (
                  <div style={{
                    padding: '16px 20px', borderRadius: 12, marginBottom: 20,
                    background: internalTimetable.eligible !== false ? '#f0fdf4' : '#fef2f2',
                    border: internalTimetable.eligible !== false ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                    color: internalTimetable.eligible !== false ? '#166534' : '#991b1b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 28 }}>{internalTimetable.eligible !== false ? '✅' : '⛔'}</div>
                      <div>
                        <strong style={{ fontSize: 15 }}>
                          {internalTimetable.eligible !== false ? 'Exam Eligibility Verified' : 'Attendance Shortage — Exam Barred'}
                        </strong>
                        <div style={{ fontSize: 13, marginTop: 2 }}>
                          Your Attendance: <strong>{internalTimetable.attendancePercentage ?? attendanceData?.overallPercentage ?? 0}%</strong> (Minimum Required: 75%)
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: 12,
                      background: internalTimetable.eligible !== false ? '#dcfce7' : '#fee2e2',
                      color: internalTimetable.eligible !== false ? '#15803d' : '#b91c1c'
                    }}>
                      {internalTimetable.eligible !== false ? 'ELIGIBLE FOR INTERNALS' : 'NOT ELIGIBLE (< 75%)'}
                    </span>
                  </div>
                )}

                {/* Internal Exam Timetable View */}
                {internalTimetable && internalTimetable.eligible === false ? (
                  <div style={{ background: '#fff1f2', border: '2px dashed #f43f5e', borderRadius: 14, padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
                    <h3 style={{ color: '#be123c', margin: '0 0 10px 0' }}>Internal Examination Timetable Blocked</h3>
                    <p style={{ color: '#9f1239', fontSize: 14, maxWidth: 650, margin: '0 auto 16px auto', lineHeight: 1.6 }}>
                      {internalTimetable.message || 'Students with overall attendance below 75% are strictly prohibited from taking internal examinations and viewing examination timetables.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                      {internalTimetable?.examName || 'Continuous Internal Assessment Schedule'}
                    </div>

                    {!internalTimetable?.timetable || internalTimetable.timetable.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                        No examinations are currently scheduled.
                      </div>
                    ) : (
                      <table className="results-data-table" style={{ marginTop: 8 }}>
                        <thead>
                          <tr>
                            <th>SL NO</th>
                            <th>SUBJECT CODE</th>
                            <th>SUBJECT NAME</th>
                            <th>EXAM DATE</th>
                            <th>TIME SLOT</th>
                            <th>EXAM HALL</th>
                            <th>MAX MARKS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {internalTimetable.timetable.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.slNo || idx + 1}</td>
                              <td><span className="code-pill">{row.subjectCode}</span></td>
                              <td><strong>{row.subjectName}</strong></td>
                              <td>{row.examDate}</td>
                              <td>{row.timeSlot}</td>
                              <td><span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{row.hallNo}</span></td>
                              <td><strong>{row.totalMarks || 50} M</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 4: Hall Ticket */}
            {activeTab === 'hall-ticket' && <HallTicketSection />}

            {/* Tab 5: Course Materials */}
            {activeTab === 'materials' && (
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>📄 Published Course Materials & Lecture Notes</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      All approved syllabus PDFs, lecture notes, and grounded materials for your department.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                    {safeDbMaterials.length} Materials Available
                  </span>
                </div>

                {safeDbMaterials.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                    No course materials published by faculty yet.
                  </div>
                ) : (
                  <div className="materials-grid-list" style={{ marginTop: 16 }}>
                    {safeDbMaterials.map((m) => (
                      <div key={m.id} className="material-item-card">
                        <div>
                          <div className="mat-tag">{m.subjects?.name || m.subject_name || 'Subject Material'} · PDF Notes</div>
                          <h4 className="mat-title">{m.title || m.file_name}</h4>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Uploaded by Subject Faculty · Grounded RAG Ready
                          </div>
                        </div>
                        <button className="open-pdf-btn" onClick={() => handleOpenAiAssistant(m)}>
                          📖 Open PDF & Chat AI
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: AI Study Assistant */}
            {activeTab === 'ai-study' && (
              <AiStudySection
                subjects={subjects}
                materials={safeDbMaterials}
                onOpenPdf={handleOpenAiAssistant}
                onSaveBookmark={handleSaveBookmarkGlobal}
              />
            )}

            {/* Tab 7: Practice Tests */}
            {activeTab === 'practice' && (
              <div className="content-card">
                <h3>✍️ AI Practice MCQ Tests & Subject Quizzes</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                  Practice grounded multiple-choice questions generated from your syllabus course notes.
                </p>

                {/* Practice Analytics Card */}
                {practiceScores.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 14, padding: 22, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: 16 }}>📈 Practice MCQ Score History & Analytics</h4>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Track your practice quiz score trends.</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                      <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>Tests Completed</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{practiceScores.length}</div>
                      </div>
                      <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 12, border: '1px solid #a7f3d0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#065f46', fontWeight: 800, textTransform: 'uppercase' }}>Average Accuracy</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', marginTop: 4 }}>
                          {Math.round(practiceScores.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / practiceScores.length)}%
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {practiceScores.slice(0, 5).map((sc, idx) => (
                        <div key={sc.id || idx} style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 12, border: '1px solid #cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {sc.subject} <span style={{ color: '#64748b', fontWeight: 500, fontSize: 12 }}>({sc.date})</span>
                            </span>
                            <span style={{ fontWeight: 900, color: sc.percentage >= 80 ? '#10b981' : '#d97706' }}>
                              Score: {sc.score} / {sc.total} ({sc.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subjects.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                    No subjects assigned for practice tests.
                  </div>
                ) : (
                  <div className="materials-grid-list">
                    {subjects.map((sub) => {
                      const targetMat = safeDbMaterials.find((m) => String(m.subject_id) === String(sub.id)) || {
                        id: `mat-${sub.id}`,
                        title: `${sub.fullName} Full Syllabus Notes.pdf`,
                        file_name: `${sub.code}_Notes.pdf`,
                        subject_id: sub.id,
                        subjects: { name: sub.fullName, code: sub.code }
                      }

                      const subAttempts = practiceScores.filter(sc =>
                        sc.subject === sub.fullName ||
                        sc.subject === sub.name ||
                        (sc.subject && sub.fullName && sc.subject.toLowerCase().includes(sub.name.toLowerCase()))
                      )
                      const latestAttempt = subAttempts[0]
                      const pctVal = latestAttempt ? latestAttempt.percentage : (sub.progress || 0)
                      const barColor = sub.color || (pctVal >= 75 ? '#10b981' : '#2563eb')

                      return (
                        <div key={sub.id} className="material-item-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 18 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="mat-tag">{sub.code} · Quiz Practice</div>
                              <span style={{ fontSize: 13, fontWeight: 900, color: barColor, background: '#eff6ff', padding: '2px 8px', borderRadius: 6, border: `1px solid ${barColor}40` }}>
                                {latestAttempt ? `${pctVal}%` : `${pctVal}% Progress`}
                              </span>
                            </div>
                            <h4 className="mat-title" style={{ margin: '8px 0 12px 0' }}>{sub.fullName} MCQ Practice Test</h4>
                            
                            {/* Practice Progress Bar */}
                            <div style={{ margin: '8px 0 14px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                                <span>{latestAttempt ? `Latest Score: ${latestAttempt.score}/${latestAttempt.total}` : 'Practice Quiz Target'}</span>
                                <span>{pctVal}%</span>
                              </div>
                              <div className="sub-bar-track" style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                                <div className="sub-bar-fill" style={{ width: `${pctVal}%`, background: barColor, height: '100%', borderRadius: 999, transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                          </div>

                          <button className="open-pdf-btn" onClick={() => handleOpenAiAssistant(targetMat, 'practice-tests')} style={{ width: '100%', marginTop: 4 }}>
                            ✍️ Start Practice
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 8: Results */}
            {activeTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* 50-Mark Continuous Assessment */}
                <div className="content-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>📊 Continuous Internal Evaluation Scorecard (50-Mark Scale)</h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                        Official breakdown for Internal 1 (50M), Internal 2 (50M), Assignment (10M), and Project (10M).
                      </p>
                    </div>
                  </div>

                  {safeStudentInternals.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                      No examination results have been published yet.
                    </div>
                  ) : (
                    <table className="results-data-table">
                      <thead>
                        <tr>
                          <th>SUBJECT</th>
                          <th>INT 1 (50M)</th>
                          <th>INT 2 (50M)</th>
                          <th>ASSIGNMENT (10M)</th>
                          <th>PROJECT (10M)</th>
                          <th>TOTAL SCORE (50M)</th>
                          <th>HOD STATUS</th>
                          <th>ELIGIBILITY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeStudentInternals.map((m) => {
                          const i1 = m.internal1_marks ?? 0
                          const i2 = m.internal2_marks ?? 0
                          const ass = m.assignment_marks ?? 0
                          const proj = m.project_marks ?? 0
                          const tot = m.total_internal_marks ?? (i1 + i2 + ass + proj)
                          const eligible = m.is_eligible !== false && tot >= 25
                          const matchedSub = safeDbSubjects.find((s) => String(s.id) === String(m.subject_id))
                          const subName = (m.subjects?.name && m.subjects?.name !== 'Subject') ? m.subjects.name : (matchedSub?.name || 'Deep Learning')
                          const subCode = (m.subjects?.code && m.subjects?.code !== 'SUB') ? m.subjects.code : (matchedSub?.code || 'MMC321')

                          return (
                            <tr key={m.id || m.subject_id}>
                              <td>
                                <strong>{subName}</strong>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{subCode}</div>
                              </td>
                              <td>{i1} / 50</td>
                              <td>{i2} / 50</td>
                              <td>{ass} / 10</td>
                              <td>{proj} / 10</td>
                              <td>
                                <strong style={{ fontSize: 16, color: eligible ? '#10b981' : '#ef4444' }}>
                                  {tot} / 50 Marks
                                </strong>
                              </td>
                              <td>
                                <span style={{
                                  padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                  background: m.status === 'approved_by_hod' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                  color: m.status === 'approved_by_hod' ? '#059669' : '#d97706',
                                }}>
                                  {m.status === 'approved_by_hod' ? '✓ HOD Approved' : '⏳ Under Review'}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                                  background: eligible ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: eligible ? '#059669' : '#dc2626',
                                  border: eligible ? '1px solid #10b981' : '1px solid #ef4444',
                                }}>
                                  {eligible ? '✓ Eligible' : '⚠️ Detained (<25)'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Main Examination Results */}
                <div className="content-card">
                  <h3>🏆 Main Examination Published Results (100 Marks Scale)</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    Main examination results published by the Examination Department.
                  </p>

                  {safeMainResults.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                      Main examination results have not been published yet.
                    </div>
                  ) : (
                    <table className="results-data-table">
                      <thead>
                        <tr>
                          <th>SUBJECT / EXAM</th>
                          <th>TOTAL SCORE</th>
                          <th>MAX MARKS</th>
                          <th>RESULT STATUS</th>
                          <th>PUBLISHED DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeMainResults.map((mr) => (
                          <tr key={mr.id}>
                            <td>
                              <strong>{mr.exams?.subjects?.name || mr.exams?.title || 'Main Exam'}</strong>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{mr.exams?.title}</div>
                            </td>
                            <td style={{ fontSize: 16, fontWeight: 800, color: mr.passed ? '#10b981' : '#ef4444' }}>
                              {mr.total_marks} Marks
                            </td>
                            <td>{mr.max_marks || 100}</td>
                            <td>
                              <span style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                                background: mr.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: mr.passed ? '#059669' : '#dc2626',
                              }}>
                                {mr.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: '#64748b' }}>
                              {mr.published_at ? new Date(mr.published_at).toLocaleDateString() : 'Published'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Tab 9: NEW MODULE - Academic Reports */}
            {activeTab === 'academic-reports' && (
              <AcademicReportsTab />
            )}

            {/* Tab 10: NEW MODULE - Academic Profile */}
            {activeTab === 'academic-profile' && (
              <AcademicProfileTab />
            )}

            {/* Tab 11: My Performance */}
            {activeTab === 'performance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="content-card">
                  <h3>📊 50-Mark Internal Progress & Performance</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    Calculated from actual academic records in the database.
                  </p>

                  {safeStudentInternals.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                      Academic progress will appear after academic records are available.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {safeStudentInternals.map((i) => {
                        const tot = i.total_internal_marks ?? ((i.internal1_marks || 0) + (i.internal2_marks || 0) + (i.assignment_marks || 0) + (i.project_marks || 0))
                        const pct = Math.min(100, Math.round((tot / 50) * 100))
                        const eligible = tot >= 25
                        const matchedSub = safeDbSubjects.find((s) => String(s.id) === String(i.subject_id))
                        const subName = (i.subjects?.name && i.subjects?.name !== 'Subject') ? i.subjects.name : (matchedSub?.name || 'Deep Learning')
                        const subCode = (i.subjects?.code && i.subjects?.code !== 'SUB') ? i.subjects.code : (matchedSub?.code || 'MMC321')
                        return (
                          <div key={i.subject_id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div>
                                <strong style={{ fontSize: 15, color: '#0f172a' }}>{subName} ({subCode})</strong>
                                <div style={{ fontSize: 12, color: '#64748b' }}>Faculty Assessment Entry</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: pct >= 50 ? '#10b981' : '#ef4444' }}>
                                  {tot} / 50 Marks ({pct}%)
                                </span>
                                <div style={{ marginTop: 2 }}>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800,
                                    background: eligible ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: eligible ? '#059669' : '#dc2626',
                                  }}>
                                    {eligible ? '✓ Eligible (≥25)' : '⚠️ Low Score (<25)'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar track with 50% threshold line */}
                            <div style={{ position: 'relative', margin: '12px 0 16px 0' }}>
                              <div className="sub-bar-track" style={{ height: 14, background: '#e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                                <div className="sub-bar-fill" style={{ width: `${pct}%`, background: pct >= 50 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: 7, height: '100%', transition: 'width 0.5s ease' }} />
                              </div>
                              <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: '#64748b', opacity: 0.6 }} title="Minimum Eligibility Line (25 Marks)" />
                            </div>

                            {/* Detailed Marks Breakdown Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                              <div><span style={{ color: '#64748b', display: 'block' }}>Internal 1</span><strong style={{ color: '#0f172a' }}>{i.internal1_marks || 0} / 50</strong></div>
                              <div><span style={{ color: '#64748b', display: 'block' }}>Internal 2</span><strong style={{ color: '#0f172a' }}>{i.internal2_marks || 0} / 50</strong></div>
                              <div><span style={{ color: '#64748b', display: 'block' }}>Assignment</span><strong style={{ color: '#0f172a' }}>{i.assignment_marks || 0} / 10</strong></div>
                              <div><span style={{ color: '#64748b', display: 'block' }}>Project</span><strong style={{ color: '#0f172a' }}>{i.internal3_marks || i.project_marks || 0} / 10</strong></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="content-card">
                  <h3>🏆 Main Examination Performance</h3>
                  {safeMainResults.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                      Main examination performance will appear after results are published.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {safeMainResults.map((mr) => (
                        <div key={mr.id} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <strong>{mr.exams?.subjects?.name || mr.exams?.title}</strong>: {mr.total_marks} / {mr.max_marks || 100} Marks ({mr.passed ? 'PASSED' : 'FAILED'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 12: Attendance */}
            {activeTab === 'attendance' && (
              <div className="content-card" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
                <ExactAttendanceView attendanceData={attendanceData} />
              </div>
            )}

            {/* Tab 13: Academic Calendar */}
            {activeTab === 'academic-calendar' && (
              <StudentAcademicCalendarTab />
            )}

            {/* Tab 14: Bookmarks */}
            {activeTab === 'bookmarks' && (
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>🔖 Bookmarked Revision Topics & AI Summaries</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      Saved concepts and notes for rapid exam preparation.
                    </p>
                  </div>
                </div>

                {savedBookmarks.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔖</div>
                    <strong style={{ color: '#0f172a' }}>No bookmarks saved yet.</strong>
                    <p style={{ fontSize: 13, margin: '6px 0 0 0', color: '#475569' }}>Click Save Bookmark in AI Study Assistant to save notes here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {savedBookmarks.map((bm) => (
                      <div key={bm.id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>{bm.title}</strong>
                          <span style={{ fontSize: 11, color: '#475569', background: '#ffffff', padding: '3px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>
                            {bm.subject} · {bm.date || 'Saved'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                          {bm.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 15: Complaints */}
            {activeTab === 'complaints' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="content-card">
                  <h3>💬 Raise Internal Mark Complaint</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Complaints apply strictly to <strong>Internal Examination</strong> evaluations.</p>

                  {complaintSuccess && (
                    <div style={{
                      padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                      background: complaintSuccess.includes('✓') ? '#f0fdf4' : '#fef2f2',
                      color: complaintSuccess.includes('✓') ? '#166534' : '#991b1b',
                      border: complaintSuccess.includes('✓') ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                      fontSize: 13, fontWeight: 700
                    }}>
                      {complaintSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSubmitComplaint} className="complaint-form">
                    <label>Select Internal Question / Evaluation:</label>
                    <select
                      value={complaintQuestion}
                      onChange={(e) => setComplaintQuestion(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', marginBottom: 14 }}
                    >
                      <option value="">-- Select Question or Subject Internal Score --</option>
                      {complaintOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <label>Reason for Appeal:</label>
                    <textarea
                      rows={4}
                      value={complaintReason}
                      onChange={(e) => setComplaintReason(e.target.value)}
                      placeholder="Explain why you are requesting additional marks or re-checking..."
                      required
                      style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', marginBottom: 14 }}
                    />

                    <button type="submit" className="submit-cmp-btn" style={{ padding: '12px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                      🚀 Submit Complaint to Faculty
                    </button>
                  </form>
                </div>

                <div className="content-card">
                  <h3>📋 My Submitted Complaints & Faculty Responses</h3>

                  {dbComplaints.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                      You have not submitted any complaints.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {dbComplaints.map((c) => (
                        <div key={c.id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong>{c.subject_name || 'Subject'}</strong>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: c.status === 'resolved' ? '#dcfce7' : '#fef3c7', color: c.status === 'resolved' ? '#15803d' : '#b45309', fontWeight: 800 }}>
                              {c.status?.toUpperCase() || 'SUBMITTED'}
                            </span>
                          </div>
                          <div style={{ fontSize: 13 }}>"{c.reason}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 16: Notifications */}
            {activeTab === 'notifications' && (
              <div className="content-card">
                <h3>🔔 Notifications</h3>
                {recentUpdatesList.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    You have no new notifications.
                  </div>
                ) : (
                  <div className="updates-list">
                    {recentUpdatesList.map((upd) => (
                      <div key={upd.id} className="update-item">
                        <div className={`update-icon-circle ${upd.colorClass}`}>{upd.icon}</div>
                        <div>
                          <div className="update-title">{upd.title}</div>
                          <div className="update-desc">{upd.desc}</div>
                          <div className="update-time">{upd.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 17: Profile */}
            {activeTab === 'profile' && (
              <div className="content-card">
                <h3>👤 My Student Profile & Identity</h3>
                <ProfileSettings mode="profile" />
              </div>
            )}

            {/* Tab 18: Settings */}
            {activeTab === 'settings' && (
              <div className="content-card">
                <h3>⚙️ Student Account Settings & Security</h3>
                <ProfileSettings mode="settings" />
              </div>
            )}
          </main>
        </div>

        {/* LMS PDF Viewer Modal */}
        {activePdfModal && (
          <LmsPdfViewerModal
            material={activePdfModal}
            onClose={() => setActivePdfModal(null)}
          />
        )}
      </div>
    </div>
  )
}

function HallTicketSection() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/hall-ticket')
      .then((res) => setTicket(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handlePrint() {
    window.print()
  }

  if (loading) return <p style={{ color: '#94a3b8', padding: 20 }}>Loading Official Hall Ticket...</p>
  
  if (!ticket || ticket.generated === false) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Your hall ticket has not been generated yet.</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Official admit cards generate once the examination department finalizes room allocations and schedule publishing.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f8fafc' }}>🎫 Official Examination Hall Ticket</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Official admit card for DSATM Main Examination Series</p>
        </div>
        <button
          onClick={handlePrint}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}
        >
          📥 Download / Print Hall Ticket
        </button>
      </div>

      <div
        className="printable-hall-ticket"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '2px solid rgba(124,58,237,0.4)', borderRadius: 16,
          padding: 32, color: '#f8fafc',
        }}
      >
        <div style={{ textTransform: 'uppercase', textAlign: 'center', borderBottom: '2px dashed rgba(255,255,255,0.15)', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', letterSpacing: 1 }}>{ticket.institution}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', marginTop: 4 }}>{ticket.title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Academic Year {ticket.academicYear} · Main Examination Controller</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 24, marginBottom: 28, background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Candidate Name</span>
              <strong style={{ fontSize: 15, color: '#f8fafc' }}>{ticket.studentName}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>USN / Reg No</span>
              <strong style={{ fontSize: 15, color: '#c084fc' }}>{ticket.registrationNo}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Degree & Department</span>
              <strong style={{ color: '#e2e8f0' }}>{ticket.departmentName}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Semester</span>
              <strong style={{ color: '#e2e8f0' }}>{ticket.semester}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 90, height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {ticket.avatarUrl ? <img src={ticket.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 36 }}>👤</span>}
            </div>
          </div>
        </div>

        <h4 style={{ fontSize: 14, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: 12 }}>📅 Main Examination Schedule & Room Allocation</h4>
        <table className="eduexam-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(124,58,237,0.2)', color: '#c084fc', borderBottom: '1px solid rgba(124,58,237,0.3)', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Sl No</th>
              <th style={{ padding: 10 }}>Date</th>
              <th style={{ padding: 10 }}>Time Slot</th>
              <th style={{ padding: 10 }}>Subject Code</th>
              <th style={{ padding: 10 }}>Subject Name</th>
              <th style={{ padding: 10 }}>Hall No</th>
            </tr>
          </thead>
          <tbody>
            {ticket.timetable.map((r) => (
              <tr key={r.slNo} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: 10, color: '#94a3b8' }}>{r.slNo}</td>
                <td style={{ padding: 10, fontWeight: 700, color: '#38bdf8' }}>{r.examDate}</td>
                <td style={{ padding: 10, color: '#cbd5e1' }}>{r.timeSlot}</td>
                <td style={{ padding: 10, fontWeight: 700, color: '#c084fc' }}>{r.subjectCode}</td>
                <td style={{ padding: 10, fontWeight: 600 }}>{r.subjectName}</td>
                <td style={{ padding: 10, color: '#34d399', fontWeight: 600 }}>{r.hallNo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AiStudySection({ subjects = [], materials = [], onOpenPdf, onSaveBookmark }) {
  const [selectedSubId, setSelectedSubId] = useState(subjects[0]?.id || '')

  useEffect(() => {
    if ((!selectedSubId || !subjects.some(s => s.id === selectedSubId)) && subjects.length > 0) {
      setSelectedSubId(subjects[0].id)
    }
  }, [subjects, selectedSubId])

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your AI Study Assistant & Grounded Tutor. Ask me any question on your course subjects!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const chatBottomRef = useRef(null)

  const activeSub = subjects.find((s) => s.id === selectedSubId) || subjects[0]

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.onstart = () => setIsListening(true)
    rec.onresult = (e) => {
      setInput(e.results[0][0].transcript)
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    rec.start()
  }

  async function handleSend(customText) {
    const q = customText || input.trim()
    if (!q) return

    const userMsg = { role: 'user', content: q }
    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    if (!customText) setInput('')
    setLoading(true)

    try {
      const targetMat = materials.find((m) => m.subject_id === selectedSubId)
      const res = await api.post('/chat', {
        subjectId: selectedSubId,
        materialId: targetMat?.id,
        question: q,
        history: nextMsgs,
      })

      const aiText = res.data?.answer || `Grounded response for ${activeSub?.name || 'Subject'}: ${q}`
      setMessages([...nextMsgs, { role: 'assistant', content: aiText }])
    } catch (e) {
      setMessages([...nextMsgs, {
        role: 'assistant',
        content: `Regarding **"${q}"**:\nFocus on core syllabus modules and step-by-step algorithms.`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-card" style={{ display: 'flex', flexDirection: 'column', height: '82vh', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>🤖 AI Study Assistant & Grounded Tutor</h2>
        </div>

        {subjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Subject:</label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{m.role === 'user' ? 'You' : 'AI Assistant'}</span>
              {m.role === 'assistant' && activeSub && (
                <button
                  onClick={() => onSaveBookmark(activeSub.name, `AI Notes: ${activeSub.name}`, m.content)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔖 Save Bookmark
                </button>
              )}
            </div>
            <div style={{
              background: m.role === 'user' ? '#2563eb' : '#ffffff',
              color: m.role === 'user' ? '#ffffff' : '#0f172a',
              padding: '14px 18px', borderRadius: 12,
              border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
              fontSize: 14, lineHeight: 1.6,
            }}>
              {m.role === 'assistant' ? <SafeMarkdown content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: '12px 18px', background: '#ffffff', borderRadius: 12, color: '#2563eb', fontWeight: 600, fontSize: 13 }}>
            🧠 Processing grounded context...
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI any question..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
        />
        <button type="button" onClick={handleVoice} style={{ background: isListening ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 10, fontWeight: 700 }}>
          {isListening ? '🎙️ Listening...' : '🎤 Mic'}
        </button>
        <button type="submit" disabled={loading || !input.trim()} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0 24px', borderRadius: 10, fontWeight: 800 }}>
          Send ➔
        </button>
      </form>
    </div>
  )
}

function ExactAttendanceView({ attendanceData }) {
  const [subTab, setSubTab] = useState('current')
  const hasData = Boolean(attendanceData && attendanceData.hasAnyAttendance)
  const overallPct = hasData ? (attendanceData?.overallPercentage ?? 0) : 0
  const totalClasses = hasData ? (attendanceData?.totalClasses ?? 0) : 0
  const attendedClasses = hasData ? (attendanceData?.attendedClasses ?? 0) : 0
  const absentClasses = hasData ? (attendanceData?.absentClasses ?? 0) : 0
  const isEligible = hasData ? (attendanceData?.isEligible !== false) : true
  const subjectsList = attendanceData?.subjectBreakdown || []
  const dailyLogs = attendanceData?.dailyLogs || []

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 20, padding: 24, border: '2px solid #0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            📅 Academic Attendance & Exam Eligibility
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Overall Attendance</span>
            <div style={{ fontSize: 24, fontWeight: 900, color: !hasData ? '#64748b' : isEligible ? '#10b981' : '#ef4444' }}>
              {hasData ? `${Math.round(overallPct)}%` : 'Pending Log'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Conducted / Attended</span>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#2563eb' }}>
              {attendedClasses} / {totalClasses} Hrs
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setSubTab('current')}
          style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontWeight: 800, fontSize: 14, color: subTab === 'current' ? '#2563eb' : '#64748b', borderBottom: subTab === 'current' ? '3px solid #2563eb' : 'none' }}
        >
          📚 Subject Attendance Breakdown ({subjectsList.length})
        </button>
      </div>

      {subTab === 'current' && (
        <div>
          {!hasData || subjectsList.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
              <h3 style={{ margin: 0 }}>No attendance records available yet.</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0 0' }}>
                Attendance records logged by your subject instructors will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {subjectsList.map((sub, idx) => (
                <div key={idx} style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <strong>{sub.subjectName}</strong>
                  <div style={{ fontSize: 18, fontWeight: 900, color: sub.isEligible ? '#10b981' : '#ef4444', marginTop: 8 }}>
                    {sub.percentage}% ({sub.attendedClasses}/{sub.totalClasses} Hrs)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StudentAcademicCalendarTab() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/student/calendar')
      .then((res) => setEvents(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function formatCalendarDate(dateStr) {
    if (!dateStr) return 'Date TBA'
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [yyyy, mm, dd] = dateStr.split('-')
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
        return d.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
      }
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
      }
      return dateStr
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="content-card" style={{ padding: 24, background: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 20, fontWeight: 900 }}>🗓️ Department Academic Calendar</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>
            Official examination dates, academic events, assignment deadlines, and department schedules.
          </p>
        </div>
        {events.length > 0 && (
          <span style={{ fontSize: 12, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', fontWeight: 800, borderRadius: 20, border: '1px solid #bfdbfe' }}>
            {events.length} Events Scheduled
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 12 }}>Loading academic calendar events from database...</p>
      ) : !events || events.length === 0 ? (
        <div style={{ padding: 36, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          No academic calendar events available yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {events.map((ev, idx) => {
            const dateFormatted = formatCalendarDate(ev.start_datetime)
            return (
              <div key={ev.id || idx} style={{
                background: '#f8fafc', borderRadius: 14, padding: 20,
                border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 800, border: '1px solid #bfdbfe' }}>
                    {ev.event_type || 'Academic Event'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', background: '#ffffff', padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    📅 {dateFormatted}
                  </span>
                </div>

                <h3 style={{ margin: '4px 0 0 0', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  {ev.title || 'Academic Notice'}
                </h3>

                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  {ev.description || 'Scheduled department academic event.'}
                </p>

                {ev.subjects?.name && (
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                    Subject: {ev.subjects.name} ({ev.subjects.code})
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}