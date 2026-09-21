import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import LmsPdfViewerModal from '../../components/LmsPdfViewerModal.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'
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
  const [studentInternals, setStudentInternals] = useState([])
  const [mainResults, setMainResults] = useState([])
  const [savedBookmarks, setSavedBookmarks] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [practiceScores, setPracticeScores] = useState([])
  const [attendanceData, setAttendanceData] = useState(null)
  const [internalTimetable, setInternalTimetable] = useState(null)

  useEffect(() => {
    function loadBookmarks() {
      try {
        let bms = JSON.parse(localStorage.getItem('student_bookmarks') || '[]')
        setSavedBookmarks(Array.isArray(bms) ? bms : [])
      } catch (e) {}
    }

    function loadPracticeScores() {
      try {
        let scores = JSON.parse(localStorage.getItem('student_practice_scores') || '[]')
        setPracticeScores(Array.isArray(scores) ? scores : [])
      } catch (e) {}
    }

    loadBookmarks()
    loadPracticeScores()
    window.addEventListener('bookmarks_updated', loadBookmarks)
    window.addEventListener('practice_score_updated', loadPracticeScores)

    api.get('/profile')
      .then((res) => { if (res.data) setUserProfile(res.data) })
      .catch(() => {})

    api.get('/student/subjects')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDbSubjects(res.data)
          if (!selectedSubject) setSelectedSubject(res.data[0].id)
        }
      })
      .catch(() => {})

    api.get('/student/dashboard')
      .then((res) => { if (res.data?.marks) setDbMarks(res.data.marks) })
      .catch(() => {})

    api.get('/student/complaints')
      .then((res) => { if (Array.isArray(res.data)) setDbComplaints(res.data) })
      .catch(() => {})

    api.get('/student/materials')
      .then((res) => { if (Array.isArray(res.data)) setDbMaterials(res.data) })
      .catch(() => {})

    api.get('/student/internal-marks')
      .then((res) => { if (Array.isArray(res.data)) setStudentInternals(res.data) })
      .catch(() => {})

    api.get('/student/main-results')
      .then((res) => { if (Array.isArray(res.data)) setMainResults(res.data) })
      .catch(() => {})

    api.get('/student/attendance')
      .then((res) => { if (res.data) setAttendanceData(res.data) })
      .catch(() => {})

    api.get('/student/internal-timetable')
      .then((res) => { if (res.data) setInternalTimetable(res.data) })
      .catch(() => {})

    return () => {
      window.removeEventListener('bookmarks_updated', loadBookmarks)
      window.removeEventListener('practice_score_updated', loadPracticeScores)
    }
  }, [])

  const safeDbSubjects = Array.isArray(dbSubjects) ? dbSubjects : []
  const safeStudentInternals = Array.isArray(studentInternals) ? studentInternals : []
  const safeDbMaterials = Array.isArray(dbMaterials) ? dbMaterials : []
  const safeMainResults = Array.isArray(mainResults) ? mainResults : []
  const safeDbMarks = Array.isArray(dbMarks) ? dbMarks : []

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
      icon: idx % 4 === 0 ? '📗' : idx % 4 === 1 ? '📙' : idx % 4 === 2 ? '📕' : '📘',
      progress: progressVal,
      color: idx % 4 === 0 ? '#10b981' : idx % 4 === 1 ? '#f59e0b' : idx % 4 === 2 ? '#f43f5e' : '#3b82f6',
    }
  })

  const currentSubjectObj = subjects.find((s) => String(s.id) === String(selectedSubject)) || subjects[0] || {
    id: 'sub-main',
    name: 'Deep Learning',
    fullName: 'Deep Learning',
    code: 'MMC321',
    icon: '📗',
    progress: 0,
    color: '#10b981',
  }

  // Filter materials based on search or selected subject
  const displayedMaterials = safeDbMaterials.filter((m) => {
    if (searchQuery.trim()) {
      return (m?.title || m?.file_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    }
    return !selectedSubject || String(m?.subject_id) === String(selectedSubject)
  })

  // Dynamic Recent Updates
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
      recentUpdatesList.push({
        id: `int-${i.subject_id || Math.random()}`,
        icon: '📊',
        colorClass: 'green',
        title: '50-Mark Internal Assessment',
        desc: `${i.subjects?.name || 'Subject'}: ${tot} / 50 Marks (${i.status === 'approved_by_hod' ? '✓ HOD Approved' : 'Faculty Entered'})`,
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

  async function handleSubmitComplaint(e) {
    e.preventDefault()
    if (!complaintReason.trim()) return

    try {
      const res = await api.post('/student/complaints', {
        evaluationId: safeDbMarks[0]?.id || 'eval-sample',
        reason: complaintReason,
      })
      if (res.data) setDbComplaints([res.data, ...dbComplaints])
    } catch (err) {}

    setComplaintReason('')
    setComplaintSuccess('Internal mark complaint submitted successfully to your Subject Faculty!')
    setTimeout(() => setComplaintSuccess(''), 4000)
  }

  function handleOpenAiAssistant(materialObj, initialSubTab = 'course-materials') {
    const mat = materialObj ? { ...materialObj } : (safeDbMaterials[0] ? { ...safeDbMaterials[0] } : {
      id: 'mat-default',
      title: `${currentSubjectObj?.fullName || currentSubjectObj?.name || 'Deep Learning'} Full Syllabus Notes.pdf`,
      file_name: `${currentSubjectObj?.code || 'MMC321'}_Notes.pdf`,
      subject_id: currentSubjectObj?.id || 'sub-1',
      subjects: { name: currentSubjectObj?.fullName || 'Deep Learning', code: currentSubjectObj?.code || 'MMC321' },
    })
    mat.initialTab = initialSubTab || 'course-materials'
    setActivePdfModal(mat)
  }

  function handleSaveBookmarkGlobal(subjectName, title, text) {
    try {
      const existing = JSON.parse(localStorage.getItem('student_bookmarks') || '[]')
      const newBm = {
        id: `bm-${Date.now()}`,
        subject: subjectName || currentSubjectObj?.fullName || 'Subject',
        title: title || 'Saved Concept',
        content: text,
        date: new Date().toLocaleDateString(),
      }
      const updated = [newBm, ...existing]
      localStorage.setItem('student_bookmarks', JSON.stringify(updated))
      setSavedBookmarks(updated)
      window.dispatchEvent(new Event('bookmarks_updated'))
    } catch (e) {}
  }

  const totalSubjectsCount = subjects.length
  const totalResultsPublished = safeStudentInternals.filter((i) => i?.status === 'approved_by_hod').length + safeMainResults.length
  const overallProgressVal = safeStudentInternals.length > 0
    ? Math.round(
        (safeStudentInternals.reduce((acc, i) => acc + (i?.total_internal_marks ?? ((i?.internal1_marks || 0) + (i?.internal2_marks || 0) + (i?.assignment_marks || 0) + (i?.project_marks || 0))), 0) /
          (safeStudentInternals.length * 50)) *
          100
      )
    : 0

  return (
    <div className="eduexam-shell">
      {/* EduExam AI Sidebar */}
      <aside className="eduexam-sidebar">
        <div className="eduexam-brand">
          <div className="eduexam-logo">🎓</div>
          <div className="eduexam-brand-name">EduExam AI</div>
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
            <span className="nav-icon">✍️</span> Practice Tests
          </button>
          <button
            className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <span className="nav-icon">📊</span> Results
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

      {/* Main Container */}
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

          <div className="top-header-right">
            <NotificationBell count={0} />
            <div className="header-icon-btn">⚙️</div>

            <div className="user-profile-badge" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
              <div className="user-avatar-circle" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                {userProfile?.avatar_url || user?.avatarUrl ? (
                  <img src={userProfile?.avatar_url || user?.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

        {/* Dynamic Workspace */}
        <main className="eduexam-content-body">
          {activeTab === 'dashboard' && (
            <div>
              {/* Banner Greeting */}
              <div className="greeting-banner-flex">
                <div>
                  <h1 className="greeting-title">Good Day, {user?.fullName || 'Student'}! 🖐️</h1>
                  <p className="greeting-sub">Keep Learning, Keep Growing!</p>
                </div>
                <div className="motivation-quote-box">
                  "A little progress each day adds up to big results."
                </div>
              </div>

              {/* Dynamic 4 Stat Cards */}
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
                    <div className="stat-number">0</div>
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
                    <div className="stat-number">{overallProgressVal}%</div>
                    <div className="stat-label">Overall Progress</div>
                  </div>
                  <div className="progress-donut-mini">
                    <svg width="44" height="44" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                      <path strokeDasharray={`${overallProgressVal}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Middle Section: Recent Updates | My Subjects | AI Study Assistant Right Cards */}
              <div className="dashboard-three-split">
                {/* Dynamic Recent Updates */}
                <div className="content-card">
                  <div className="card-header-line">
                    <h3>Recent Updates</h3>
                  </div>

                  {recentUpdatesList.length === 0 ? (
                    <div style={{ padding: '24px 16px', color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                      No recent updates published yet.
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

                {/* Dynamic My Subjects Grid */}
                <div className="content-card">
                  <div className="card-header-line">
                    <h3>My Subjects</h3>
                    <span className="view-all-link" onClick={() => setActiveTab('subjects')}>View All</span>
                  </div>

                  {subjects.length === 0 ? (
                    <div style={{ padding: '24px 16px', color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                      No subjects added yet by your faculty.
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

                {/* AI Assistant Right Cards */}
                <div className="right-panel-column">
                  <div className="ai-assistant-promo-card">
                    <div className="robot-avatar-icon">🤖</div>
                    <h4>AI Study Assistant</h4>
                    <p>Ask questions directly from your subject materials</p>
                    <button className="open-ai-btn" onClick={() => handleOpenAiAssistant()}>
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
                <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
                  No subjects added yet by faculty.
                </div>
              ) : (
                <>
                  <div className="card-header-line">
                    <h2>{currentSubjectObj.icon} {currentSubjectObj.fullName}</h2>
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
                  <p className="sub-detail-desc">Course Code: {currentSubjectObj.code} · Syllabus PDFs & Grounded RAG Assistant</p>

                  <h4 style={{ margin: '20px 0 12px 0', fontSize: 16 }}>Published Course Materials</h4>
                  {(displayedMaterials.length > 0 ? displayedMaterials : [
                    {
                      id: `mat-${currentSubjectObj.id || 'main'}`,
                      title: `${currentSubjectObj.code || 'MMC321'}_${(currentSubjectObj.fullName || currentSubjectObj.name || 'Deep Learning').replace(/\s+/g, '_')}_Full_Syllabus_Notes.pdf`,
                      file_name: `${(currentSubjectObj.fullName || currentSubjectObj.name || 'Deep Learning').replace(/\s+/g, '_')}_Course_Curriculum.pdf`,
                      subject_id: currentSubjectObj.id,
                      subjects: { name: currentSubjectObj.fullName || currentSubjectObj.name || 'Deep Learning', code: currentSubjectObj.code || 'MMC321' }
                    }
                  ]).map((m) => (
                    <div key={m.id} className="material-item-card">
                      <div>
                        <div className="mat-tag">{m.subjects?.name || currentSubjectObj.name} · PDF Document</div>
                        <h4 className="mat-title">{m.title || m.file_name}</h4>
                      </div>
                      <button className="open-pdf-btn" onClick={() => handleOpenAiAssistant(m)}>
                        📖 Open PDF & Ask AI
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Tab 3: Course Materials */}
          {activeTab === 'materials' && (
            <div className="content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>📄 Published Syllabus Notes & Course Materials</h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                    All syllabus PDFs, lecture notes, and grounded RAG revision materials for your department.
                  </p>
                </div>
                <span style={{ fontSize: 12, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                  {(dbMaterials.length > 0 ? dbMaterials : subjects).length} Materials Available
                </span>
              </div>

              <div className="materials-grid-list" style={{ marginTop: 16 }}>
                {(dbMaterials.length > 0 ? dbMaterials : subjects.map((sub) => ({
                  id: `mat-${sub.id}`,
                  title: `${sub.fullName} Full Syllabus & Lecture Notes.pdf`,
                  file_name: `${sub.code}_Syllabus_Notes.pdf`,
                  subject_id: sub.id,
                  subjects: { name: sub.fullName, code: sub.code },
                  created_at: new Date().toISOString(),
                }))).map((m) => (
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
            </div>
          )}

          {/* Tab: AI Study Assistant Embedded View */}
          {activeTab === 'ai-study' && (
            <AiStudySection
              subjects={subjects}
              materials={dbMaterials}
              onOpenPdf={handleOpenAiAssistant}
              onSaveBookmark={handleSaveBookmarkGlobal}
            />
          )}

          {/* Tab: Examinations */}
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
                        Your Attendance: <strong>{internalTimetable.attendancePercentage ?? attendanceData?.overallPercentage ?? 85}%</strong> (Minimum Required: 75%)
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
                  <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 700 }}>
                    Please consult your HOD / Department Coordinator immediately regarding attendance regularization.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                    {internalTimetable?.examName || 'Continuous Internal Assessment Test - 1 (IAT-1 2026)'}
                  </div>

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
                      {(internalTimetable?.timetable || [
                        { slNo: 1, subjectCode: 'MMC321', subjectName: 'Deep Learning', examDate: '2026-10-05', timeSlot: '10:00 AM - 11:30 AM', hallNo: 'Block-A Room 302', totalMarks: 50 },
                        { slNo: 2, subjectCode: 'MMC322', subjectName: 'Database Management Systems', examDate: '2026-10-06', timeSlot: '10:00 AM - 11:30 AM', hallNo: 'Block-A Room 302', totalMarks: 50 },
                        { slNo: 3, subjectCode: 'MMC323', subjectName: 'Java Enterprise Programming', examDate: '2026-10-07', timeSlot: '10:00 AM - 11:30 AM', hallNo: 'Block-B Room 405', totalMarks: 50 },
                        { slNo: 4, subjectCode: 'MMC324', subjectName: 'Computer Networks', examDate: '2026-10-08', timeSlot: '10:00 AM - 11:30 AM', hallNo: 'Block-B Room 405', totalMarks: 50 },
                      ]).map((row, idx) => (
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
                </>
              )}
            </div>
          )}

          {/* Tab 4: Results */}
          {activeTab === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Card 1: 50-Mark Continuous Internal Assessment Scorecard */}
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>📊 Continuous Internal Evaluation Scorecard (50-Mark Scale)</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      Official breakdown for Internal 1 (15M), Internal 2 (15M), Assignment (10M), and Project (10M).
                    </p>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 12px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                    Scale: 50 Marks per Subject
                  </span>
                </div>

                {/* Overall Aggregate KPI Summary Card */}
                {studentInternals.length > 0 && (() => {
                  let totalScoredSum = 0
                  let totalMaxSum = studentInternals.length * 50
                  let eligibleCount = 0

                  studentInternals.forEach((m) => {
                    const i1 = m.internal1_marks ?? 0
                    const i2 = m.internal2_marks ?? 0
                    const ass = m.assignment_marks ?? 0
                    const proj = m.project_marks ?? 0
                    const tot = m.total_internal_marks ?? (i1 + i2 + ass + proj)
                    totalScoredSum += tot
                    if (m.is_eligible !== false && tot >= 25) eligibleCount++
                  })

                  const overallPct = totalMaxSum > 0 ? Math.round((totalScoredSum / totalMaxSum) * 100) : 0

                  return (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14,
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff',
                      padding: 20, borderRadius: 14, marginBottom: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                    }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Internal Scored</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>
                          {totalScoredSum} / {totalMaxSum} <span style={{ fontSize: 14, color: '#cbd5e1' }}>Marks</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall Aggregate Score</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: overallPct >= 50 ? '#4ade80' : '#f87171', marginTop: 4 }}>
                          {overallPct}% <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>({overallPct >= 75 ? 'First Class Distinction' : overallPct >= 60 ? 'First Class' : 'Pass Class'})</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Main Exam Eligibility</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: eligibleCount === studentInternals.length ? '#4ade80' : '#fbbf24', marginTop: 4 }}>
                          {eligibleCount} / {studentInternals.length} <span style={{ fontSize: 14, color: '#cbd5e1' }}>Eligible (≥25/50)</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {studentInternals.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                    Internal marks are currently being evaluated by your subject faculty.
                  </div>
                ) : (
                  <table className="results-data-table">
                    <thead>
                      <tr>
                        <th>SUBJECT</th>
                        <th>INT 1 (15M)</th>
                        <th>INT 2 (15M)</th>
                        <th>ASSIGNMENT (10M)</th>
                        <th>PROJECT (10M)</th>
                        <th>TOTAL SCORE (50M)</th>
                        <th>HOD STATUS</th>
                        <th>ELIGIBILITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentInternals.map((m) => {
                        const i1 = m.internal1_marks ?? 0
                        const i2 = m.internal2_marks ?? 0
                        const ass = m.assignment_marks ?? 0
                        const proj = m.project_marks ?? 0
                        const tot = m.total_internal_marks ?? (i1 + i2 + ass + proj)
                        const eligible = m.is_eligible !== false && tot >= 25

                        return (
                          <tr key={m.id || m.subject_id}>
                            <td>
                              <strong>{m.subjects?.name || 'Subject'}</strong>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{m.subjects?.code}</div>
                            </td>
                            <td>{i1} / 15</td>
                            <td>{i2} / 15</td>
                            <td>{ass} / 10</td>
                            <td>{proj} / 10</td>
                            <td>
                              <strong style={{ fontSize: 16, color: eligible ? '#10b981' : '#ef4444' }}>
                                {tot} / 50 Marks
                              </strong>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: m.status === 'approved_by_hod' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: m.status === 'approved_by_hod' ? '#059669' : '#d97706',
                              }}>
                                {m.status === 'approved_by_hod' ? '✓ HOD Approved' : '⏳ Under Review'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 800,
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

              {/* Card 2: Main Exam Published Final Results (100 Marks Total) */}
              {mainResults.length > 0 && (
                <div className="content-card">
                  <h3>🏆 Main Examination Published Results (100 Marks Scale)</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    Final Score = 50-Mark HOD Internal + (100-Mark Written Exam ÷ 2).
                  </p>

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
                      {mainResults.map((mr) => (
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
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800,
                              background: mr.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: mr.passed ? '#059669' : '#dc2626',
                            }}>
                              {mr.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>
                            {mr.published_at ? new Date(mr.published_at).toLocaleDateString() : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card 3: Question-wise AI & Teacher Evaluation Feedback */}
              {dbMarks.length > 0 && (
                <div className="content-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>📊 Detailed Answer Evaluations & Faculty Feedback</h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                        Question-by-question breakdown with AI evaluation and final faculty marks.
                      </p>
                    </div>

                    {/* Total Exam Marks KPI Box */}
                    {(() => {
                      const totalMax = studentResults.reduce((acc, r) => acc + Number(r.maxMarks || 0), 0)
                      const totalTeacher = studentResults.reduce((acc, r) => acc + Number(r.teacherScore || 0), 0)
                      const totalAi = studentResults.reduce((acc, r) => acc + Number(r.aiScore || 0), 0)
                      const pct = totalMax > 0 ? Math.round((totalTeacher / totalMax) * 100) : 0
                      return (
                        <div style={{ display: 'flex', gap: 14, background: '#f8fafc', padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1' }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Max</span>
                            <strong style={{ fontSize: 16, color: '#0f172a' }}>{totalMax} Marks</strong>
                          </div>
                          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 14 }}>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>AI Score</span>
                            <strong style={{ fontSize: 16, color: '#2563eb' }}>{totalAi} / {totalMax}</strong>
                          </div>
                          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 14 }}>
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Teacher Marks</span>
                            <strong style={{ fontSize: 16, color: pct >= 40 ? '#10b981' : '#ef4444' }}>{totalTeacher} / {totalMax} ({pct}%)</strong>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <table className="results-data-table">
                    <thead>
                      <tr><th>EXAM</th><th>Q.NO</th><th>QUESTION</th><th>MAX</th><th>AI SCORE</th><th>TEACHER MARKS</th><th>FEEDBACK</th></tr>
                    </thead>
                    <tbody>
                      {studentResults.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.exam}</strong></td>
                          <td><span style={{ padding: '3px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>{r.qNo}</span></td>
                          <td>{r.question}</td>
                          <td><strong>{r.maxMarks}</strong></td>
                          <td style={{ color: '#2563eb', fontWeight: 600 }}>{r.aiScore}</td>
                          <td style={{ color: '#059669', fontWeight: 800, fontSize: 15 }}>{r.teacherScore}</td>
                          <td style={{ fontSize: 13, color: '#475569' }}>{r.feedback}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: My Performance */}
          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Panel 1: 50-Mark Internal Assessment Progress */}
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>📊 50-Mark Internal Progress (Continuous Evaluation)</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      Subject-wise 50-mark internal breakdown (Internal 1, Internal 2, Assignment, Project). Minimum 25/50 required for exam eligibility.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                    Scale: 50 Marks Max
                  </span>
                </div>

                {studentInternals.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    Internal performance analytics will generate once faculty submits internal marks.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {studentInternals.map((i) => {
                      const tot = i.total_internal_marks ?? ((i.internal1_marks || 0) + (i.internal2_marks || 0) + (i.assignment_marks || 0) + (i.project_marks || 0))
                      const pct = Math.min(100, Math.round((tot / 50) * 100))
                      const eligible = tot >= 25
                      return (
                        <div key={i.subject_id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <strong style={{ fontSize: 15, color: '#0f172a' }}>{i.subjects?.name || 'Subject'} ({i.subjects?.code})</strong>
                              <div style={{ fontSize: 12, color: '#64748b' }}>Faculty Assessment Entry</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: pct >= 50 ? '#10b981' : '#ef4444' }}>
                                {tot} / 50 Marks ({pct}%)
                              </span>
                              <div style={{ marginTop: 2 }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: eligible ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: eligible ? '#059669' : '#dc2626',
                                }}>
                                  {eligible ? '✓ Eligible (≥25)' : '⚠️ Low Score (<25)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar track with 50% / 25 mark threshold line */}
                          <div style={{ position: 'relative', margin: '12px 0 16px 0' }}>
                            <div className="sub-bar-track" style={{ height: 14, background: '#e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                              <div className="sub-bar-fill" style={{ width: `${pct}%`, background: pct >= 50 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: 7, height: '100%', transition: 'width 0.5s ease' }} />
                            </div>
                            {/* 50% Threshold marker line */}
                            <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: '#64748b', opacity: 0.6 }} title="Minimum Eligibility Line (25 Marks)" />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                            <div><span style={{ color: '#64748b', display: 'block' }}>Internal 1</span><strong style={{ color: '#0f172a' }}>{i.internal1_marks || 0} / 15</strong></div>
                            <div><span style={{ color: '#64748b', display: 'block' }}>Internal 2</span><strong style={{ color: '#0f172a' }}>{i.internal2_marks || 0} / 15</strong></div>
                            <div><span style={{ color: '#64748b', display: 'block' }}>Assignment</span><strong style={{ color: '#0f172a' }}>{i.assignment_marks || 0} / 10</strong></div>
                            <div><span style={{ color: '#64748b', display: 'block' }}>Project</span><strong style={{ color: '#0f172a' }}>{i.project_marks || 0} / 10</strong></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Panel 2: 100-Mark Main Exam Performance Analysis */}
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>🏆 100-Mark Main Examination Performance</h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                      Main semester end examination score distribution and overall status.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', background: '#f0fdf4', color: '#166534', fontWeight: 700, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    Scale: 100 Marks Max
                  </span>
                </div>

                {mainResults.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    Main examination results have not been published yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {mainResults.map((mr) => {
                      const max = mr.max_marks || 100
                      const score = mr.total_marks || 0
                      const pct = Math.min(100, Math.round((score / max) * 100))
                      const passed = mr.passed ?? (pct >= 40)
                      return (
                        <div key={mr.id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <strong style={{ fontSize: 15, color: '#0f172a' }}>
                                {mr.exams?.subjects?.name || mr.exams?.title || 'Main Examination'}
                              </strong>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{mr.exams?.title}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: passed ? '#10b981' : '#ef4444' }}>
                                {score} / {max} Marks ({pct}%)
                              </span>
                              <div style={{ marginTop: 2 }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: passed ? '#059669' : '#dc2626',
                                }}>
                                  {passed ? '✓ PASSED' : '❌ FAILED'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="sub-bar-track" style={{ height: 14, background: '#e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                            <div className="sub-bar-fill" style={{ width: `${pct}%`, background: passed ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)' : 'linear-gradient(90deg, #ef4444, #b91c1c)', borderRadius: 7, height: '100%', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Practice Tests */}
          {activeTab === 'practice' && (
            <div className="content-card">
              <h3>✍️ AI Practice MCQ Tests & Subject Quizzes</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Practice grounded multiple-choice questions generated from your syllabus course notes.
              </p>

              {/* Real-time Practice Analytics & Chart Card */}
              {practiceScores.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 14, padding: 22, marginBottom: 24, boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: 16 }}>📈 Practice MCQ Score History & Analytics</h4>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Track your practice quiz score trends and percentage accuracy.</p>
                    </div>
                    <button
                      onClick={() => { localStorage.removeItem('student_practice_scores'); setPracticeScores([]); }}
                      style={{ padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11, color: '#64748b', cursor: 'pointer' }}
                    >
                      Clear History
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                    <div style={{ background: '#ffffff', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tests Completed</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{practiceScores.length}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Average Accuracy</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', marginTop: 4 }}>
                        {Math.round(practiceScores.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / practiceScores.length)}%
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Highest Score</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>
                        {Math.max(...practiceScores.map((s) => s.score || 0))} / {practiceScores[0]?.total || 5}
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Charts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {practiceScores.slice(0, 5).map((sc, idx) => (
                      <div key={sc.id || idx} style={{ background: '#ffffff', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {sc.subject} <span style={{ color: '#64748b', fontWeight: 500, fontSize: 12 }}>({sc.date})</span>
                          </span>
                          <span style={{ fontWeight: 900, color: sc.percentage >= 80 ? '#10b981' : sc.percentage >= 60 ? '#f59e0b' : '#ef4444' }}>
                            Score: {sc.score} / {sc.total} ({sc.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{
                            width: `${sc.percentage}%`, height: '100%', borderRadius: 5,
                            background: sc.percentage >= 80 ? 'linear-gradient(90deg, #10b981, #059669)' : sc.percentage >= 60 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="materials-grid-list">
                {subjects.map((sub) => (
                  <div key={sub.id} className="material-item-card">
                    <div>
                      <div className="mat-tag">{sub.code} · Quiz Practice</div>
                      <h4 className="mat-title">{sub.fullName} MCQ Practice Test</h4>
                    </div>
                    <button className="open-pdf-btn" onClick={() => handleOpenAiAssistant(null, 'practice-tests')}>
                      ✍️ Start Practice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Attendance */}
          {activeTab === 'attendance' && (
            <div className="content-card" style={{ padding: 24, background: '#f1f5f9' }}>
              <ExactAttendanceView attendanceData={attendanceData} />
            </div>
          )}

          {/* Tab: Bookmarks */}
          {activeTab === 'bookmarks' && (
            <div className="content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>🔖 Bookmarked Revision Topics & AI Summaries</h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                    Saved concepts, formulas, and AI Study Assistant notes for rapid exam preparation.
                  </p>
                </div>
                {savedBookmarks.length > 0 && (
                  <button
                    onClick={() => { localStorage.removeItem('student_bookmarks'); setSavedBookmarks([]); }}
                    style={{ padding: '6px 14px', borderRadius: 6, background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    🗑️ Clear All Bookmarks
                  </button>
                )}
              </div>

              {savedBookmarks.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔖</div>
                  <strong style={{ color: '#0f172a' }}>No bookmarks saved yet.</strong>
                  <p style={{ fontSize: 13, margin: '6px 0 0 0', color: '#64748b' }}>Click the 🔖 Bookmark button next to any AI Study response or PDF page note to save it here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {savedBookmarks.map((bm) => (
                    <div key={bm.id} style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>{bm.title}</strong>
                        <span style={{ fontSize: 11, color: '#64748b', background: '#e2e8f0', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                          {bm.subject} · {bm.date}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                        {bm.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Internal Mark Complaints */}
          {activeTab === 'complaints' && (
            <div className="content-card">
              <h3>💬 Raise Internal Mark Complaint</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Complaints apply strictly to <strong>Internal Examination</strong> evaluations.</p>

              {complaintSuccess && <div className="success-alert">{complaintSuccess}</div>}

              <form onSubmit={handleSubmitComplaint} className="complaint-form">
                <label>Select Internal Question / Evaluation:</label>
                <select value={complaintQuestion} onChange={(e) => setComplaintQuestion(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
                  <option value="">-- Select Question or Subject Internal Score --</option>
                  {studentResults.map((r, idx) => (
                    <option key={idx} value={`${r.exam} - ${r.qNo}: ${r.question}`}>
                      {r.exam} ({r.qNo}) - Score: {r.teacherScore}/{r.maxMarks}
                    </option>
                  ))}
                  {studentInternals.map((i) => (
                    <option key={i.subject_id} value={`${i.subjects?.name || 'Subject'} 50-Mark Internal Sheet`}>
                      {i.subjects?.name} Internal Total Score: {i.total_internal_marks}/50
                    </option>
                  ))}
                </select>

                <label style={{ marginTop: 14 }}>Reason for Appeal:</label>
                <textarea
                  rows={4}
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  placeholder="Explain why you are requesting additional marks or re-checking..."
                  required
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />

                <button type="submit" className="submit-cmp-btn" style={{ marginTop: 14 }}>Submit Complaint to Faculty</button>
              </form>
            </div>
          )}

          {/* Tab: Notifications */}
          {activeTab === 'notifications' && (
            <div className="content-card">
              <h3>🔔 Student Notifications & HOD Academic Notices</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Official notices from your Department HOD and Subject Faculty.
              </p>

              {recentUpdatesList.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  No new notifications.
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

          {/* Tab: Official Examination Hall Ticket */}
          {activeTab === 'hall-ticket' && <HallTicketSection />}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="content-card">
              <h3>👤 My Student Profile & Photo Upload</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Manage your personal identity, photo, registration USN, and department credentials.
              </p>
              <ProfileSettings mode="profile" />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="content-card">
              <h3>⚙️ Student Account Settings & Security</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Update your login password, email notifications, and portal preferences.
              </p>
              <ProfileSettings mode="settings" />
            </div>
          )}
        </main>
      </div>

      {/* LMS Course Material View Modal (Split PDF + Grounded AI Assistant) */}
      {activePdfModal && (
        <LmsPdfViewerModal
          material={activePdfModal}
          onClose={() => setActivePdfModal(null)}
        />
      )}
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
  if (!ticket) return <div className="stat-box" style={{ padding: 20 }}>Unable to load Hall Ticket.</div>

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
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
          }}
        >
          📥 Download / Print Hall Ticket
        </button>
      </div>

      {/* Official Printable Hall Ticket Box */}
      <div
        className="printable-hall-ticket"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '2px solid rgba(124,58,237,0.4)',
          borderRadius: 16,
          padding: 32,
          color: '#f8fafc',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ textTransform: 'uppercase', textAlign: 'center', borderBottom: '2px dashed rgba(255,255,255,0.15)', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', letterSpacing: 1 }}>{ticket.institution}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc', marginTop: 4 }}>{ticket.title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Academic Year {ticket.academicYear} · Main Examination Controller</div>
        </div>

        {/* Student & Center Info Grid */}
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
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Examination Center</span>
              <strong style={{ color: '#38bdf8' }}>{ticket.examCenter}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 90, height: 110, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {ticket.avatarUrl ? <img src={ticket.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 36 }}>👤</span>}
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>OFFICIAL PHOTO</span>
          </div>
        </div>

        {/* Examination Schedule Timetable */}
        <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a5b4fc', marginBottom: 12 }}>📅 Main Examination Schedule & Room Allocation</h4>
        <table className="eduexam-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(124,58,237,0.2)', color: '#c084fc', borderBottom: '1px solid rgba(124,58,237,0.3)', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Sl No</th>
              <th style={{ padding: 10 }}>Date</th>
              <th style={{ padding: 10 }}>Time Slot</th>
              <th style={{ padding: 10 }}>Subject Code</th>
              <th style={{ padding: 10 }}>Subject Name</th>
              <th style={{ padding: 10 }}>Hall No</th>
              <th style={{ padding: 10 }}>Invigilator Sign</th>
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
                <td style={{ padding: 10, color: '#64748b' }}>___________</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Authorization Seal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16, borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 400 }}>
            <strong>Important Note:</strong> Candidate must carry this Admit Card & College Identity Card to every examination session. Malpractice will result in immediate disqualification.
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'serif', fontSize: 18, fontWeight: 700, color: '#34d399', fontStyle: 'italic', marginBottom: 2 }}>Dr. Controller of Exams</div>
            <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>CONTROLLER OF EXAMINATIONS</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AiStudySection({ subjects = [], materials = [], onOpenPdf, onSaveBookmark }) {
  const safeSubjects = (Array.isArray(subjects) && subjects.length > 0) ? subjects : [
    { id: 'sub-dl', name: 'Deep Learning', fullName: 'Deep Learning', code: 'MMC321' },
    { id: 'sub-dbms', name: 'Database Management Systems', fullName: 'Database Management Systems', code: 'MMC322' },
    { id: 'sub-java', name: 'Enterprise Java Programming', fullName: 'Enterprise Java Programming', code: 'MMC323' },
    { id: 'sub-cloud', name: 'Cloud Computing & DevOps', fullName: 'Cloud Computing & DevOps', code: 'MMC324' },
  ]
  const safeMaterials = Array.isArray(materials) ? materials : []

  const [selectedSubId, setSelectedSubId] = useState(safeSubjects[0]?.id || '')

  useEffect(() => {
    if ((!selectedSubId || !safeSubjects.some(s => s.id === selectedSubId)) && safeSubjects.length > 0) {
      setSelectedSubId(safeSubjects[0].id)
    }
  }, [safeSubjects, selectedSubId])

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your AI Study Assistant & Grounded Tutor. Powered by Groq \`qwen/qwen3.8-27b\`. Ask me any question, ask for MCQs, or speak via Mic!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [toast, setToast] = useState('')
  const chatBottomRef = useRef(null)

  const activeSub = safeSubjects.find((s) => s.id === selectedSubId) || safeSubjects[0]

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setToast('Voice speech recognition not supported in browser. Type query instead.')
      setTimeout(() => setToast(''), 3000)
      return
    }
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
      const targetMat = safeMaterials.find((m) => m.subject_id === selectedSubId)
      const res = await api.post('/chat', {
        subjectId: selectedSubId,
        materialId: targetMat?.id,
        question: q,
        history: nextMsgs,
      })

      const aiText = res.data?.answer || `### Answer for ${activeSub.name}\n\nRegarding **"${q}"**:\n* Core syllabus concepts for ${activeSub.name} emphasize structural principles, step-by-step algorithms, and exam review notes.`
      setMessages([...nextMsgs, { role: 'assistant', content: aiText }])
    } catch (e) {
      setMessages([...nextMsgs, {
        role: 'assistant',
        content: `### Grounded Academic Notes for ${activeSub.name}\n\nRegarding **"${q}"**:\n\n* **Primary Definitions**: Key definitions cover core mathematical models, architectural trade-offs, and query execution steps.\n* **Exam Tip**: Focus on module diagrams and step-by-step derivations for end-semester examinations.`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-card" style={{ display: 'flex', flexDirection: 'column', height: '82vh', padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>🤖 AI Study Assistant & Grounded Academic Tutor</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
            Powered by Groq Model <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>qwen/qwen3.8-27b</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Subject:</label>
          <select
            value={selectedSubId}
            onChange={(e) => setSelectedSubId(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
          >
            {safeSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <button
            onClick={() => onOpenPdf(safeMaterials.find(m => m.subject_id === selectedSubId) || null, 'course-materials')}
            style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            📖 Open PDF Split View
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div style={{ padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Quick Prompts:</span>
        <button onClick={() => handleSend('Give me 5 practice MCQs with answers')} style={{ padding: '4px 10px', borderRadius: 16, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📝 5 Practice MCQs
        </button>
        <button onClick={() => handleSend('Summarize the full course syllabus in key bullet points')} style={{ padding: '4px 10px', borderRadius: 16, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📑 Syllabus Summary
        </button>
        <button onClick={() => handleSend('What are the most important exam questions and formulas?')} style={{ padding: '4px 10px', borderRadius: 16, background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          💡 Key Formulas & Questions
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {toast && (
          <div style={{ background: '#ef4444', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            {toast}
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{m.role === 'user' ? 'You' : 'AI Assistant'}</span>
              {m.role === 'assistant' && (
                <button
                  onClick={() => onSaveBookmark(activeSub.name, `AI Answer: ${activeSub.name}`, m.content)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔖 Save Bookmark
                </button>
              )}
            </div>
            <div style={{
              background: m.role === 'user' ? '#2563eb' : '#ffffff',
              color: m.role === 'user' ? '#ffffff' : '#0f172a',
              padding: '14px 18px',
              borderRadius: 12,
              border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              {m.role === 'assistant' ? <SafeMarkdown content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: '12px 18px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', color: '#2563eb', fontWeight: 600, fontSize: 13, width: 'fit-content' }}>
            🧠 Processing grounded context with Groq qwen/qwen3.8-27b...
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask AI any question on ${activeSub.name} or click Mic...`}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
        />
        <button
          type="button"
          onClick={handleVoice}
          style={{ background: isListening ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          {isListening ? '🎙️ Listening...' : '🎤 Mic'}
        </button>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0 24px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}
        >
          Send ➔
        </button>
      </form>
    </div>
  )
}

function ExactAttendanceView({ attendanceData }) {
  const [subTab, setSubTab] = useState('current')

  const semLabel = attendanceData?.semesterLabel || 'Sem 3'
  const ayLabel = attendanceData?.academicYear || 'A.Y. 2026-27 - Odd'
  const hasData = Boolean(attendanceData && attendanceData.hasAnyAttendance)
  const overallPct = hasData ? (attendanceData?.overallPercentage ?? 0) : 0
  const totalClasses = hasData ? (attendanceData?.totalClasses ?? 0) : 0
  const attendedClasses = hasData ? (attendanceData?.attendedClasses ?? 0) : 0
  const absentClasses = hasData ? (attendanceData?.absentClasses ?? 0) : 0
  const pendingClasses = attendanceData?.pendingClasses ?? 0
  const noAttClasses = attendanceData?.noAttendanceClasses ?? 0

  const subjectsList = hasData ? (attendanceData?.subjectBreakdown || []) : []
  const dailyLogs = hasData ? (attendanceData?.dailyLogs || []) : []

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Top Header */}
      <div style={{ background: '#09090b', color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 20, cursor: 'pointer' }}>←</div>
        <div style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>Attendance</div>
      </div>

      {/* 2. Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <button
          onClick={() => setSubTab('current')}
          style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
            fontWeight: 800, fontSize: 16, color: subTab === 'current' ? '#1e1b4b' : '#94a3b8',
            borderBottom: subTab === 'current' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Current
        </button>
        <button
          onClick={() => setSubTab('previous')}
          style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
            fontWeight: 700, fontSize: 16, color: subTab === 'previous' ? '#1e1b4b' : '#94a3b8',
            borderBottom: subTab === 'previous' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Previous
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 3. Semester & Overall Progress Box */}
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ background: '#f1f5f9', color: '#0f172a', padding: '8px 14px', borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{semLabel.split(' ')[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{semLabel.split(' ')[1] || '3'}</div>
            </div>
            
            <div style={{ flex: 1, marginLeft: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: '#0d9488', fontWeight: 800, fontSize: 14 }}>{ayLabel}</span>
                <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 800 }}>▲</span>
              </div>
              
              {/* Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${overallPct}%`, height: '100%', background: overallPct >= 75 ? '#22c55e' : '#ef4444', borderRadius: 4 }} />
                </div>
                <span style={{ fontWeight: 900, color: overallPct >= 75 ? '#16a34a' : '#dc2626', fontSize: 14 }}>
                  {overallPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Subject Header */}
          <div style={{ background: '#e2e8f0', borderRadius: 10, padding: '10px 14px', margin: '0 0 12px 0', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
              <div>Subject</div>
              <div style={{ textAlign: 'center' }}>Total</div>
              <div style={{ textAlign: 'center' }}>Present</div>
            </div>
          </div>

          {/* Subjects Rows */}
          {subjectsList.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>⏳</div>
              <strong>No Attendance Records Found</strong>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Attendance entries will appear here once your Subject Faculty logs attendance for your section.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {subjectsList.map((sub, idx) => {
                const isShortage = sub.isShortage || sub.percentage < 75.0
                return (
                  <div key={idx} style={{ padding: '0 4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', fontSize: 14, color: '#1e293b', marginBottom: 4, fontWeight: 500 }}>
                      <div style={{ fontWeight: 600 }}>{sub.subjectName}</div>
                      <div style={{ textAlign: 'center', color: '#475569' }}>{sub.totalClasses}</div>
                      <div style={{ textAlign: 'center', fontWeight: 700 }}>{sub.attendedClasses}</div>
                    </div>
                    
                    {/* Progress Line under subject & percentage */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${sub.percentage}%`, height: '100%', background: isShortage ? '#ef4444' : '#22c55e' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: isShortage ? '#dc2626' : '#16a34a', minWidth: 50, textAlign: 'right' }}>
                        {Number(sub.percentage).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total Row */}
          <div style={{ borderTop: '1px solid #cbd5e1', marginTop: 14, paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 60px 60px', fontWeight: 900, fontSize: 15, color: '#0f172a' }}>
            <div>Total</div>
            <div style={{ textAlign: 'center' }}>{totalClasses}</div>
            <div style={{ textAlign: 'center' }}>{attendedClasses}</div>
          </div>
        </div>

        {/* 4. Attendance KPI Counts Grid */}
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 800 }}>
            Present : <span style={{ fontWeight: 900, color: '#15803d' }}>{attendedClasses} / {totalClasses}</span>
          </div>
          <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 800 }}>
            Absent : <span style={{ fontWeight: 900, color: '#b91c1c' }}>{absentClasses} / {totalClasses}</span>
          </div>
          <div style={{ fontSize: 14, color: '#ea580c', fontWeight: 800 }}>
            Pending : <span style={{ fontWeight: 900, color: '#c2410c' }}>{pendingClasses} / {totalClasses}</span>
          </div>
          <div style={{ fontSize: 14, color: '#0284c7', fontWeight: 800 }}>
            No Attendance : <span style={{ fontWeight: 900, color: '#0369a1' }}>{noAttClasses} / {totalClasses}</span>
          </div>
        </div>

        {/* 5. Attendance Legend Box */}
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 14, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#334155', textAlign: 'center' }}>
          P = Present , A = Absent, NA = No Attendance, - = No Lecture/Lab
        </div>

        {/* 6. Slot-wise Daily Log Table */}
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr)', background: '#f1f5f9', borderRadius: 10, padding: '10px 8px', fontWeight: 800, fontSize: 13, color: '#1e293b', textAlign: 'center', marginBottom: 10 }}>
            <div>Date</div>
            <div>Slot 1</div>
            <div>Slot 2</div>
            <div>Slot 3</div>
            <div>Slot 4</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dailyLogs.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr)', alignItems: 'center', textAlign: 'center', fontSize: 13 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>
                  <div>{row.date}</div>
                  <div style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>{row.day}</div>
                </div>

                {row.slots.map((slot, sIdx) => {
                  let bg = 'transparent'
                  let color = '#64748b'

                  if (slot.type === 'present' || slot.text === 'P') {
                    bg = '#e6f4ea'
                    color = '#16a34a'
                  } else if (slot.type === 'absent' || slot.text === 'A') {
                    bg = '#fce8e6'
                    color = '#dc2626'
                  }

                  return (
                    <div
                      key={sIdx}
                      style={{
                        background: bg, color: color, padding: '8px 0', margin: '0 3px',
                        borderRadius: 6, fontWeight: 800, fontSize: 13
                      }}
                    >
                      {slot.text}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}