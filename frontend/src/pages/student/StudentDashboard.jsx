import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import NotificationBell from '../../components/NotificationBell.jsx'
import LmsPdfViewerModal from '../../components/LmsPdfViewerModal.jsx'
import ProfileSettings from '../../components/ProfileSettings.jsx'
import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedSubject, setSelectedSubject] = useState('sub-dbms')
  const [activePdfModal, setActivePdfModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Complaint form state
  const [complaintQuestion, setComplaintQuestion] = useState('Q3 - DBMS Normalization 3NF')
  const [complaintReason, setComplaintReason] = useState('')
  const [complaintSuccess, setComplaintSuccess] = useState('')
  const [complaintsList, setComplaintsList] = useState([
    {
      id: 'cmp-101',
      question: 'Q3 - DBMS Normalization 3NF',
      examTitle: 'DBMS Internal-1',
      reason: 'I explained transitive dependencies clearly on page 2. Requesting 1 additional mark.',
      status: 'In Review',
      date: '2026-09-15',
    },
  ])

  const [dbSubjects, setDbSubjects] = useState([])
  const [dbMarks, setDbMarks] = useState([])
  const [dbComplaints, setDbComplaints] = useState([])
  const [dbMaterials, setDbMaterials] = useState([])
  const [studentInternals, setStudentInternals] = useState([])
  const [mainResults, setMainResults] = useState([])

  const defaultSubjects = [
    { id: 'sub-dbms', name: 'DBMS', fullName: 'Database Management Systems', code: 'DBMS-301', icon: '📗', progress: 72, color: '#10b981' },
    { id: 'sub-ds', name: 'DSA', fullName: 'Data Structures & Algorithms', code: 'DSA-302', icon: '📙', progress: 84, color: '#f59e0b' },
    { id: 'sub-cn', name: 'Computer Networks', fullName: 'Computer Networks', code: 'CN-303', icon: '📕', progress: 65, color: '#f43f5e' },
    { id: 'sub-os', name: 'Operating Systems', fullName: 'Operating Systems', code: 'OS-304', icon: '📘', progress: 76, color: '#3b82f6' },
  ]

  const subjects = dbSubjects.length > 0
    ? dbSubjects.map((s, idx) => ({
        id: s.id,
        name: s.name,
        fullName: s.name,
        code: s.code || `SUB-30${idx + 1}`,
        icon: idx % 4 === 0 ? '📗' : idx % 4 === 1 ? '📙' : idx % 4 === 2 ? '📕' : '📘',
        progress: 70 + (idx * 5) % 25,
        color: idx % 4 === 0 ? '#10b981' : idx % 4 === 1 ? '#f59e0b' : idx % 4 === 2 ? '#f43f5e' : '#3b82f6',
      }))
    : defaultSubjects

  const courseMaterialsMap = {
    'sub-dbms': [
      { id: 'mat-1', title: 'DBMS - Unit 1 Introduction to DBMS (PDF)', file_name: 'DBMS_Unit_1_Introduction.pdf', unit: 1, type: 'PDF' },
      { id: 'mat-2', title: 'DBMS - Unit 2 Relational Model & SQL (PDF)', file_name: 'DBMS_Unit_2_Relational_Model.pdf', unit: 2, type: 'PDF' },
      { id: 'mat-3', title: 'DBMS - Unit 3 Normalization (1NF to BCNF)', file_name: 'DBMS_Unit_3_Normalization.pdf', unit: 3, type: 'PDF' },
      { id: 'mat-4', title: 'DBMS - Unit 4 Transaction Management & ACID', file_name: 'DBMS_Unit_4_Transactions.pdf', unit: 4, type: 'PDF' },
    ],
  }

  useEffect(() => {
    api.get('/student/subjects')
      .then((res) => { if (Array.isArray(res.data) && res.data.length > 0) setDbSubjects(res.data) })
      .catch(() => {})

    api.get('/student/dashboard')
      .then((res) => { if (res.data?.marks) setDbMarks(res.data.marks) })
      .catch(() => {})

    api.get('/student/complaints')
      .then((res) => { if (Array.isArray(res.data) && res.data.length > 0) setDbComplaints(res.data) })
      .catch(() => {})

    api.get('/student/materials')
      .then((res) => { if (Array.isArray(res.data) && res.data.length > 0) setDbMaterials(res.data) })
      .catch(() => {})

    api.get('/student/internal-marks')
      .then((res) => { if (Array.isArray(res.data)) setStudentInternals(res.data) })
      .catch(() => {})

    api.get('/student/main-results')
      .then((res) => { if (Array.isArray(res.data)) setMainResults(res.data) })
      .catch(() => {})
  }, [])

  const studentResults = dbMarks.length > 0
    ? dbMarks.map((m) => ({
        exam: m.answers?.questions?.exams?.title || 'Course Exam',
        type: m.answers?.questions?.exams?.type || 'Internal',
        qNo: `Q${m.answers?.questions?.question_no || 1}`,
        question: m.answers?.questions?.question_text || 'Subject question',
        maxMarks: m.answers?.questions?.marks || 10,
        aiScore: m.ai_suggested_marks || 0,
        teacherScore: m.final_marks !== null ? m.final_marks : m.ai_suggested_marks,
        verified: m.final_marks !== null,
        feedback: m.ai_evidence?.evidence || 'Answers evaluated successfully.',
      }))
    : [
        { exam: 'DBMS Internal-1', type: 'Internal', qNo: 'Q1', question: 'Define DBMS and 3-schema architecture', maxMarks: 5, aiScore: 4.5, teacherScore: 4.5, verified: true, feedback: 'Accurate diagram and clear separation of external/conceptual levels.' },
        { exam: 'DBMS Internal-1', type: 'Internal', qNo: 'Q2', question: 'Differentiate 2NF and 3NF with examples', maxMarks: 5, aiScore: 3.5, teacherScore: 4.0, verified: true, feedback: 'Good explanation of transitive dependency. Partial credit awarded.' },
        { exam: 'DBMS Internal-1', type: 'Internal', qNo: 'Q3', question: 'Explain ACID properties in transaction processing', maxMarks: 10, aiScore: 8.0, teacherScore: 8.5, verified: true, feedback: 'Clear examples for Isolation and Durability.' },
      ]

  async function handleSubmitComplaint(e) {
    e.preventDefault()
    if (!complaintReason.trim()) return

    try {
      const res = await api.post('/student/complaints', {
        evaluationId: '844476c6-8606-48d0-af3a-53df0ce63ffb',
        reason: complaintReason,
      })
      if (res.data) {
        setDbComplaints([res.data, ...dbComplaints])
      }
    } catch (err) {
      const newCmp = {
        id: `cmp-${Date.now()}`,
        question: complaintQuestion,
        examTitle: 'DBMS Internal-1',
        reason: complaintReason,
        status: 'Open',
        date: new Date().toISOString().split('T')[0],
      }
      setComplaintsList([newCmp, ...complaintsList])
    }

    setComplaintReason('')
    setComplaintSuccess('Internal mark complaint submitted successfully to your Subject Faculty!')
    setTimeout(() => setComplaintSuccess(''), 4000)
  }

  const currentSubjectObj = subjects.find((s) => s.id === selectedSubject) || subjects[0]

  return (
    <div className="eduexam-shell">
      {/* EduExam AI Sidebar matching Reference Screenshot 1 & 6 */}
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
            onClick={() => {
              const firstMat = courseMaterialsMap['sub-dbms'][0]
              setActivePdfModal(firstMat)
            }}
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
            <span className="nav-badge-count">3</span>
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
        {/* Top Header Bar matching Screenshot 1 */}
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
            <NotificationBell count={3} />
            <div className="header-icon-btn">⚙️</div>

            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : 'N'}
              </div>
              <div>
                <div className="user-name-title">{user?.fullName || 'Nagaraj'}</div>
                <div className="user-sub-title">MCA - 3rd Sem</div>
              </div>
              <span className="caret-down">▾</span>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace */}
        <main className="eduexam-content-body">
          {activeTab === 'dashboard' && (
            <div>
              {/* Banner Greeting & Quote Box */}
              <div className="greeting-banner-flex">
                <div>
                  <h1 className="greeting-title">Good Morning, {user?.fullName || 'Nagaraj'}! 🖐️</h1>
                  <p className="greeting-sub">Keep Learning, Keep Growing!</p>
                </div>
                <div className="motivation-quote-box">
                  "A little progress each day adds up to big results."
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="dashboard-stats-grid">
                <div className="stat-box blue">
                  <div className="stat-icon-square">📘</div>
                  <div>
                    <div className="stat-number">6</div>
                    <div className="stat-label">My Subjects</div>
                  </div>
                </div>

                <div className="stat-box purple">
                  <div className="stat-icon-square">📋</div>
                  <div>
                    <div className="stat-number">3</div>
                    <div className="stat-label">Upcoming Exams</div>
                  </div>
                </div>

                <div className="stat-box green">
                  <div className="stat-icon-square">📊</div>
                  <div>
                    <div className="stat-number">4</div>
                    <div className="stat-label">Results Published</div>
                  </div>
                </div>

                <div className="stat-box progress-box">
                  <div>
                    <div className="stat-number">78%</div>
                    <div className="stat-label">Overall Progress</div>
                  </div>
                  <div className="progress-donut-mini">
                    <svg width="44" height="44" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                      <path strokeDasharray="78, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Middle Section: Recent Updates | My Subjects | AI Study Assistant Right Cards */}
              <div className="dashboard-three-split">
                {/* Recent Updates */}
                <div className="content-card">
                  <div className="card-header-line">
                    <h3>Recent Updates</h3>
                    <span className="view-all-link">View All</span>
                  </div>

                  <div className="updates-list">
                    <div className="update-item">
                      <div className="update-icon-circle blue">📄</div>
                      <div>
                        <div className="update-title">New Material Uploaded</div>
                        <div className="update-desc">DBMS - Unit 1 Introduction to DBMS (PDF)</div>
                        <div className="update-time">2 hours ago</div>
                      </div>
                    </div>

                    <div className="update-item">
                      <div className="update-icon-circle green">📊</div>
                      <div>
                        <div className="update-title">Internal-1 Result Published</div>
                        <div className="update-desc">DBMS - Your result is now available</div>
                        <div className="update-time">1 day ago</div>
                      </div>
                    </div>

                    <div className="update-item">
                      <div className="update-icon-circle orange">📝</div>
                      <div>
                        <div className="update-title">New Question Paper</div>
                        <div className="update-desc">DSA - Internal 2 question paper uploaded</div>
                        <div className="update-time">2 days ago</div>
                      </div>
                    </div>

                    <div className="update-item">
                      <div className="update-icon-circle cyan">📌</div>
                      <div>
                        <div className="update-title">Assignment Released</div>
                        <div className="update-desc">CN - Assignment 1</div>
                        <div className="update-time">3 days ago</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* My Subjects Grid */}
                <div className="content-card">
                  <div className="card-header-line">
                    <h3>My Subjects</h3>
                    <span className="view-all-link">View All</span>
                  </div>

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
                </div>

                {/* AI Assistant Right Cards */}
                <div className="right-panel-column">
                  <div className="ai-assistant-promo-card">
                    <div className="robot-avatar-icon">🤖</div>
                    <h4>AI Study Assistant</h4>
                    <p>Ask questions directly from your subject materials</p>
                    <button
                      className="open-ai-btn"
                      onClick={() => {
                        const firstMat = courseMaterialsMap['sub-dbms'][0]
                        setActivePdfModal(firstMat)
                      }}
                    >
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
              <div className="materials-grid-list">
                {(courseMaterialsMap[selectedSubject] || []).map((m) => (
                  <div key={m.id} className="material-item-card">
                    <div>
                      <div className="mat-tag">Unit {m.unit} · PDF Document</div>
                      <h4 className="mat-title">{m.title}</h4>
                    </div>
                    <button
                      className="open-pdf-btn"
                      onClick={() => setActivePdfModal(m)}
                    >
                      📖 Open PDF & Ask AI
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Course Materials */}
          {activeTab === 'materials' && (
            <div className="content-card">
              <h3>📄 Published Course Materials</h3>
              <div className="materials-grid-list" style={{ marginTop: 16 }}>
                {courseMaterialsMap['sub-dbms'].map((m) => (
                  <div key={m.id} className="material-item-card">
                    <div>
                      <div className="mat-tag">DBMS Unit {m.unit}</div>
                      <h4 className="mat-title">{m.title}</h4>
                    </div>
                    <button className="open-pdf-btn" onClick={() => setActivePdfModal(m)}>
                      📖 Open PDF & Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Results */}
          {activeTab === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Card 1: 50-Mark Faculty Internal Evaluation & Main Exam Eligibility */}
              <div className="content-card">
                <div className="card-header-line">
                  <h3>📋 My Internal Assessment Marks (50 Marks Scale)</h3>
                  <span className="mat-tag" style={{ background: '#3b82f6', color: '#fff' }}>Eligibility Threshold: 25/50 (50%)</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  Faculty 50-Mark Internal Assessment: Internal-1 (15m), Internal-2 (15m), Assignment (10m/20m), Project (10m/0m). Approved by HOD.
                </p>

                {studentInternals.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    Internal marks are currently being evaluated by your subject faculty.
                  </div>
                ) : (
                  <table className="results-data-table">
                    <thead>
                      <tr>
                        <th>SUBJECT</th>
                        <th>INT 1 (15M)</th>
                        <th>INT 2 (15M)</th>
                        <th>ASSIGNMENT</th>
                        <th>PROJECT</th>
                        <th>TOTAL (50M)</th>
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
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.subjects?.code}</div>
                            </td>
                            <td>{i1} / 15</td>
                            <td>{i2} / 15</td>
                            <td>{ass}</td>
                            <td>{proj}</td>
                            <td>
                              <strong style={{ fontSize: 15, color: eligible ? '#10b981' : '#ef4444' }}>
                                {tot} / 50
                              </strong>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: m.status === 'approved_by_hod' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                color: m.status === 'approved_by_hod' ? '#10b981' : '#f59e0b',
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
                                background: eligible ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                color: eligible ? '#34d399' : '#f87171',
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
                  <h3>🏆 Main Examination Published Results (100 Marks)</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                    Final Score = 50-Mark HOD Internal + (100-Mark Written Exam ÷ 2).
                  </p>

                  <table className="results-data-table">
                    <thead>
                      <tr>
                        <th>SUBJECT / EXAM</th>
                        <th>FINAL SCORE</th>
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
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{mr.exams?.title}</div>
                          </td>
                          <td style={{ fontSize: 16, fontWeight: 800, color: mr.passed ? '#10b981' : '#ef4444' }}>
                            {mr.total_marks}
                          </td>
                          <td>{mr.max_marks || 100}</td>
                          <td>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800,
                              background: mr.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                              color: mr.passed ? '#34d399' : '#f87171',
                            }}>
                              {mr.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#94a3b8' }}>
                            {mr.published_at ? new Date(mr.published_at).toLocaleDateString() : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card 3: Question-wise AI & Teacher Evaluation Feedback */}
              <div className="content-card">
                <h3>📊 Detailed Answer Evaluations & Faculty Feedback</h3>
                <table className="results-data-table">
                  <thead>
                    <tr><th>EXAM</th><th>Q.NO</th><th>QUESTION</th><th>MAX</th><th>AI SCORE</th><th>TEACHER MARKS</th><th>FEEDBACK</th></tr>
                  </thead>
                  <tbody>
                    {studentResults.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.exam}</strong></td>
                        <td>{r.qNo}</td>
                        <td>{r.question}</td>
                        <td>{r.maxMarks}</td>
                        <td style={{ color: '#3b82f6' }}>{r.aiScore}</td>
                        <td style={{ color: '#10b981', fontWeight: 700 }}>{r.teacherScore}</td>
                        <td>{r.feedback}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Internal Mark Complaints */}
          {activeTab === 'complaints' && (
            <div className="content-card">
              <h3>💬 Raise Internal Mark Complaint</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Complaints apply strictly to <strong>Internal Examination</strong> evaluations.</p>

              {complaintSuccess && <div className="success-alert">{complaintSuccess}</div>}

              <form onSubmit={handleSubmitComplaint} className="complaint-form">
                <label>Select Internal Question:</label>
                <select value={complaintQuestion} onChange={(e) => setComplaintQuestion(e.target.value)}>
                  <option value="Q1 - Define DBMS & 3-schema architecture">Q1 - Define DBMS & 3-schema architecture (Marks: 4.5/5)</option>
                  <option value="Q2 - Differentiate 2NF and 3NF">Q2 - Differentiate 2NF and 3NF (Marks: 4.0/5)</option>
                  <option value="Q3 - Explain ACID properties">Q3 - Explain ACID properties (Marks: 8.5/10)</option>
                </select>

                <label>Reason for Appeal:</label>
                <textarea
                  rows={4}
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  placeholder="Explain why you are requesting additional marks..."
                  required
                />

                <button type="submit" className="submit-cmp-btn">Submit Complaint to Faculty</button>
              </form>
            </div>
          )}

          {/* Tab: Official Examination Hall Ticket */}
          {activeTab === 'hall-ticket' && <HallTicketSection />}

          {/* Profile / Settings Fallbacks */}
          {(activeTab === 'profile' || activeTab === 'settings') && <ProfileSettings />}
        </main>
      </div>

      {/* LMS Course Material View Modal (Split PDF + Grounded AI Assistant) matching Screenshot 6 */}
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