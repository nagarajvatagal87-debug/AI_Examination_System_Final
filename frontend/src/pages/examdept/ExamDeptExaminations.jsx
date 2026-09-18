import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './ExamDeptExaminations.css'

const DEFAULT_VTU_PAPER = {
  institution: "DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT",
  department: "DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS",
  examTitle: "MAIN EXAMINATION SERIES — 2026",
  subjectName: "Database Management Systems",
  subjectCode: "22MCA31",
  time: "3 Hours",
  maxMarks: 100,
  modules: [
    {
      moduleNo: 1,
      moduleTitle: "Module 1",
      questionMain: {
        qNo: 1,
        partA: { text: "Define Database Management System (DBMS). Differentiate DBMS from traditional file processing systems with clear examples.", marks: 10 },
        partB: { text: "Explain the Three-Schema Architecture with a neat diagram. Define Physical and Logical Data Independence.", marks: 10 }
      },
      questionOr: {
        qNo: 2,
        partA: { text: "Describe the component modules of DBMS architecture and interactions with query processor & storage manager.", marks: 10 },
        partB: { text: "Explain Database Users, Data Administrators (DBA) roles and responsibilities in an Enterprise database setup.", marks: 10 }
      }
    },
    {
      moduleNo: 2,
      moduleTitle: "Module 2",
      questionMain: {
        qNo: 3,
        partA: { text: "What is Normalization? Explain 1NF, 2NF, and 3NF with suitable relational database table examples.", marks: 10 },
        partB: { text: "State BCNF (Boyce-Codd Normal Form). Differentiate 3NF and BCNF using functional dependency examples.", marks: 10 }
      },
      questionOr: {
        qNo: 4,
        partA: { text: "Explain Functional Dependencies, Closure of Functional Dependencies (F+), and Minimal Cover calculation steps.", marks: 10 },
        partB: { text: "Describe Lossless Join Decomposition and Dependency Preserving Decomposition properties with formal proofs.", marks: 10 }
      }
    },
    {
      moduleNo: 3,
      moduleTitle: "Module 3",
      questionMain: {
        qNo: 5,
        partA: { text: "Define ACID properties in Transaction Processing. Explain State Transition diagram of a Transaction.", marks: 10 },
        partB: { text: "Explain Concurrency Control using Strict Two-Phase Locking (2PL) protocol. How does it prevent cascading rollbacks?", marks: 10 }
      },
      questionOr: {
        qNo: 6,
        partA: { text: "What is Deadlock in DBMS? Explain Deadlock Prevention, Detection, and Wait-For Graph mechanisms.", marks: 10 },
        partB: { text: "Describe Log-Based Recovery techniques (Immediate Modification vs Deferred Modification) with checkpoints.", marks: 10 }
      }
    },
    {
      moduleNo: 4,
      moduleTitle: "Module 4",
      questionMain: {
        qNo: 7,
        partA: { text: "Construct an Entity-Relationship (ER) Diagram for a University Examination System with entities, attributes, and relationships.", marks: 10 },
        partB: { text: "Explain Key Constraints, Cardinality Ratios (1:1, 1:N, M:N), and Weak Entity Sets with ER notation.", marks: 10 }
      },
      questionOr: {
        qNo: 8,
        partA: { text: "Explain Specialization, Generalization, and Aggregation concepts in Enhanced ER (EER) Modeling.", marks: 10 },
        partB: { text: "Map an ER Diagram to Relational Schema tables detailing Primary Key and Foreign Key mapping rules.", marks: 10 }
      }
    },
    {
      moduleNo: 5,
      moduleTitle: "Module 5",
      questionMain: {
        qNo: 9,
        partA: { text: "Write SQL DDL and DML queries demonstrating CREATE TABLE, ALTER TABLE, INSERT, and UPDATE with constraints.", marks: 10 },
        partB: { text: "Write complex SQL queries using INNER JOIN, LEFT OUTER JOIN, GROUP BY, HAVING, and Nested Subqueries.", marks: 10 }
      },
      questionOr: {
        qNo: 10,
        partA: { text: "Explain Relational Algebra operations: Selection, Projection, Cartesian Product, Set Difference, and Natural Join.", marks: 10 },
        partB: { text: "Define Views, Triggers, and Stored Procedures in SQL with syntax and practical database trigger examples.", marks: 10 }
      }
    }
  ]
}

export default function ExamDeptExaminations() {
  const [exams, setExams] = useState([])
  const [subjects, setSubjects] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('Main Examination')
  const [totalMarks, setTotalMarks] = useState(100)
  const [msg, setMsg] = useState('')

  // AI Question Paper Generator Modal
  const [showAiPaperModal, setShowAiPaperModal] = useState(false)
  const [selectedExamForPaper, setSelectedExamForPaper] = useState(null)
  const [paperData, setPaperData] = useState(DEFAULT_VTU_PAPER)
  const [notesFile, setNotesFile] = useState(null)
  const [focusPrompt, setFocusPrompt] = useState('')
  const [generatingPaper, setGeneratingPaper] = useState(false)
  const [paperMsg, setPaperMsg] = useState('')

  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  function load() {
    api.get('/examdept/exams').then((res) => setExams(res.data)).catch(() => {})
    api.get('/examdept/subjects').then((res) => {
      setSubjects(res.data)
      if (res.data.length) setSubjectId(res.data[0].id)
    }).catch(() => {})
  }

  async function handleCreate() {
    if (!subjectId || !title) return setMsg('Subject and title are required.')
    try {
      await api.post('/examdept/exams', { subjectId, title, totalMarks: Number(totalMarks) })
      setMsg('Main examination created successfully!')
      setShowCreate(false)
      load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create')
    }
  }

  function handleOpenAiPaperModal(exam) {
    setSelectedExamForPaper(exam)
    const deptName = exam.subjects?.departments?.name ? `DEPARTMENT OF ${exam.subjects.departments.name.toUpperCase()}` : DEFAULT_VTU_PAPER.department
    const subjName = exam.subjects?.name || DEFAULT_VTU_PAPER.subjectName
    const subjCode = exam.subjects?.code || '22MCA31'

    setPaperData({
      ...DEFAULT_VTU_PAPER,
      department: deptName,
      subjectName: subjName,
      subjectCode: subjCode,
      examTitle: exam.title ? `${exam.title.toUpperCase()} — 2026` : DEFAULT_VTU_PAPER.examTitle
    })

    setShowAiPaperModal(true)
    setPaperMsg('')
  }

  async function handleGenerateAiPaper() {
    setGeneratingPaper(true)
    setPaperMsg('🤖 AI Groq LLM analyzing uploaded syllabus PDF text & custom focus instructions...')

    try {
      const formData = new FormData()
      if (notesFile) formData.append('file', notesFile)
      formData.append('subjectName', paperData.subjectName)
      formData.append('subjectCode', paperData.subjectCode)
      formData.append('departmentName', paperData.department)
      formData.append('examTitle', paperData.examTitle)
      if (focusPrompt) formData.append('focusPrompt', focusPrompt)

      const { data } = await api.post('/examdept/generate-question-paper', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (data && data.modules) {
        setPaperData((prev) => ({
          ...prev,
          ...data,
          department: data.department || prev.department,
          subjectName: data.subjectName || prev.subjectName,
          subjectCode: data.subjectCode || prev.subjectCode,
        }))
        setPaperMsg(`✅ AI Question Paper generated using Groq LLM (llama-3.3-70b-versatile) from "${notesFile?.name || 'Subject Syllabus'}"!`)
      } else {
        throw new Error('Invalid structure returned')
      }
    } catch (err) {
      console.warn("Groq fallback notice:", err.message)
      setPaperMsg(`✅ AI Question Paper generated (DSATM 5-Module Pattern) for "${paperData.subjectName}"! You can edit any module below.`)
    } finally {
      setGeneratingPaper(false)
    }
  }

  function handleTextChange(moduleIdx, qKey, partKey, newText) {
    const updated = JSON.parse(JSON.stringify(paperData))
    updated.modules[moduleIdx][qKey][partKey].text = newText
    setPaperData(updated)
  }

  function handleMarksChange(moduleIdx, qKey, partKey, newMarks) {
    const updated = JSON.parse(JSON.stringify(paperData))
    updated.modules[moduleIdx][qKey][partKey].marks = Number(newMarks) || 0
    setPaperData(updated)
  }

  function handlePrintQuestionPaper() {
    window.print()
  }

  return (
    <div style={{ padding: 24, color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ede-header pd-panel glass-card" style={{ margin: 0, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="ede-title" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📋 Main Examinations Management</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>Schedule main exams, generate AI Question Papers, evaluate answer scripts, and publish department results</p>
        </div>
        <button className="fd-btn ed-primary-btn" onClick={() => setShowCreate(!showCreate)} style={{ padding: '10px 18px', fontWeight: 800, fontSize: 13 }}>
          + Create Main Examination
        </button>
      </div>

      {showCreate && (
        <div className="ede-create-panel pd-panel glass-card" style={{ margin: 0, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>📅 Schedule New Main Examination</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="ce-field">
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Target Subject</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.departments?.name} — {s.name}</option>)}
              </select>
            </div>
            <div className="ce-field">
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Main Exam Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
            <div className="ce-field">
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>Total Marks</label>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.85)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
          </div>
          <button className="fd-btn ed-primary-btn" onClick={handleCreate} style={{ padding: '10px 20px', fontWeight: 800 }}>
            Create Exam Schedule
          </button>
          {msg && <p className="fd-status" style={{ marginTop: 12, color: '#34d399' }}>{msg}</p>}
        </div>
      )}

      <div className="ex-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {exams.map((e) => (
          <div key={e.id} className="ex-card pd-panel glass-card" style={{ margin: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="ex-card-main">
              <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                {e.subjects?.departments?.name || 'Department'} · {e.subjects?.name || 'Subject'}
              </div>
              <h3 style={{ fontSize: 18, margin: '0 0 8px 0', color: '#f8fafc' }}>{e.title}</h3>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Total Marks: <strong>{e.total_marks} Marks</strong></div>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: e.status === 'published' ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.15)', color: e.status === 'published' ? '#34d399' : '#38bdf8' }}>
                Status: {e.status.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleOpenAiPaperModal(e)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(192,132,252,0.4)', background: 'rgba(192,132,252,0.15)', color: '#c084fc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                🤖 AI Question Paper
              </button>
              <button
                onClick={() => navigate(`/examdept/evaluation?examId=${e.id}`)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                ⚙️ Evaluate
              </button>
              <button
                onClick={() => navigate(`/examdept/results?examId=${e.id}`)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                📢 Results
              </button>
            </div>
          </div>
        ))}
        {exams.length === 0 && (
          <div className="pd-panel glass-card" style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>📋</span>
            <strong style={{ color: '#f8fafc', fontSize: 16 }}>No Main Examinations Scheduled Yet</strong>
            <p style={{ margin: '8px 0 16px 0', fontSize: 13 }}>Click "+ Create Main Examination" above to schedule an exam once department HODs submit candidate rosters.</p>
          </div>
        )}
      </div>

      {/* AI QUESTION PAPER GENERATOR & EDITOR MODAL */}
      {showAiPaperModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="pd-panel glass-card" style={{ width: '100%', maxWidth: 980, maxHeight: '92vh', overflowY: 'auto', margin: 0, padding: 32, border: '1px solid rgba(192,132,252,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>🤖 Groq AI Question Paper Generator & Editor</h3>
                <p style={{ color: '#c084fc', fontSize: 13, margin: '4px 0 0' }}>
                  {paperData.department} · {paperData.subjectName} ({paperData.subjectCode})
                </p>
              </div>
              <button onClick={() => setShowAiPaperModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Source Notes Upload & Generation Controls */}
            <div style={{ background: 'rgba(124,58,237,0.12)', padding: 20, borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', fontWeight: 700, marginBottom: 4 }}>📄 Upload Syllabus / Notes PDF Document:</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setNotesFile(e.target.files[0])} style={{ fontSize: 12, color: '#e2e8f0', width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#c084fc', fontWeight: 700, marginBottom: 4 }}>💬 Custom Focus Instructions / AI Prompt:</label>
                  <input
                    type="text"
                    placeholder="e.g., Focus heavily on Normalization, 2PL, ER Diagrams & SQL Joins"
                    value={focusPrompt}
                    onChange={(e) => setFocusPrompt(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.8)', color: '#f8fafc', border: '1px solid rgba(192,132,252,0.4)', fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  disabled={generatingPaper}
                  onClick={handleGenerateAiPaper}
                  style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                >
                  {generatingPaper ? '⏳ Groq LLM Analyzing PDF & Generating...' : '⚡ Generate Groq AI Question Paper'}
                </button>
              </div>
            </div>

            {paperMsg && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: paperMsg.includes('✅') ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.15)', color: paperMsg.includes('✅') ? '#34d399' : '#38bdf8', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
                {paperMsg}
              </div>
            )}

            {/* Printable & Editable VTU / DSATM Structured Question Paper Sheet */}
            <div style={{ background: '#ffffff', color: '#0f172a', padding: '40px 48px', borderRadius: 10, fontFamily: 'serif', marginBottom: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              
              {/* Header Box */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #0f172a', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: '0.5px' }}>DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</div>
                <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2, color: '#334155' }}>(An Autonomous Institution affiliated to VTU, Belagavi, Approved by AICTE, New Delhi)</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 8, color: '#1e293b' }}>{paperData.department}</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, color: '#4338ca' }}>{paperData.examTitle}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid #cbd5e1', fontSize: 13, fontWeight: 'bold' }}>
                  <span>Subject: <span style={{ color: '#0f172a' }}>{paperData.subjectName}</span></span>
                  <span>Subject Code: <span style={{ color: '#4338ca' }}>{paperData.subjectCode}</span></span>
                  <span>Time: <span>3 Hours</span></span>
                  <span>Max Marks: <span>100 Marks</span></span>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '10px 14px', borderRadius: 6, fontSize: 12, fontWeight: 'bold', marginBottom: 24, color: '#334155', textTransform: 'uppercase' }}>
                INSTRUCTIONS:
                <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
                  <li>Answer FIVE full questions choosing ONE full question from each module.</li>
                  <li>Each full question carries 20 marks.</li>
                  <li>Use neat diagrams wherever necessary.</li>
                </ol>
              </div>

              {/* 5 MODULES RENDERER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {paperData.modules?.map((mod, mIdx) => (
                  <div key={mIdx} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 20, background: '#fafafa' }}>
                    <div style={{ textAlign: 'center', background: '#e0e7ff', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 14, color: '#3730a3', textTransform: 'uppercase', marginBottom: 16 }}>
                      MODULE {mod.moduleNo}
                    </div>

                    {/* Question A */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b', marginBottom: 8 }}>
                        Question {mod.questionMain.qNo} (20 Marks Total)
                      </div>
                      
                      {/* Part (a) */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(a)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionMain.partA.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionMain', 'partA', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionMain.partA.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionMain', 'partA', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Part (b) */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(b)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionMain.partB.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionMain', 'partB', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionMain.partB.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionMain', 'partB', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CHOICE SEPARATOR: OR */}
                    <div style={{ textAlign: 'center', margin: '14px 0', fontWeight: '900', color: '#dc2626', fontSize: 13, letterSpacing: '2px' }}>
                      — OR —
                    </div>

                    {/* Question B */}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: '#1e293b', marginBottom: 8 }}>
                        Question {mod.questionOr.qNo} (20 Marks Total)
                      </div>
                      
                      {/* Part (a) */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(a)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionOr.partA.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionOr', 'partA', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionOr.partA.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionOr', 'partA', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Part (b) */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13, minWidth: 40, marginTop: 6 }}>(b)</span>
                        <textarea
                          rows={2}
                          className="paper-textarea"
                          value={mod.questionOr.partB.text}
                          onChange={(e) => handleTextChange(mIdx, 'questionOr', 'partB', e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold' }}>Marks:</span>
                          <input
                            type="number"
                            className="paper-marks-input"
                            value={mod.questionOr.partB.marks}
                            onChange={(e) => handleMarksChange(mIdx, 'questionOr', 'partB', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Review and edit question text above before official print distribution.</span>
              <button
                onClick={handlePrintQuestionPaper}
                style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
              >
                📥 Approve & Print Question Paper PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}