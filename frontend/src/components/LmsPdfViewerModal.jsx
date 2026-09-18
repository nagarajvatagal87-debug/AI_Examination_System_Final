import { useState, useRef, useEffect } from 'react'
import api from '../api/client.js'
import './LmsPdfViewerModal.css'

export default function LmsPdfViewerModal({ material, onClose }) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 24
  const [zoomLevel, setZoomLevel] = useState(100)
  const [activeSubTab, setActiveSubTab] = useState('course-materials')

  const [selectedDoc, setSelectedDoc] = useState(material?.file_name || 'DBMS Unit 1.pdf')
  const [messages, setMessages] = useState([
    {
      role: 'user',
      userLabel: 'You',
      content: 'What is DBMS?',
    },
    {
      role: 'assistant',
      userLabel: 'AI Assistant',
      content: 'A Database Management System (DBMS) is a software system that allows users to define, create, maintain and control access to a database. It ensures data independence, minimal redundancy, and transaction ACID integrity.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(textToSend) {
    const question = textToSend || input.trim()
    if (!question) return

    const userMsg = { role: 'user', userLabel: 'You', content: question }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await api.post('/chat', {
        subjectId: material?.subject_id || 'sub-dbms',
        materialId: material?.id,
        question: `[Document: ${selectedDoc}, Page ${currentPage}] ${question}`,
        history: newMessages,
      })

      const aiAnswer = res.data?.answer || getGroundedAnswer(question)
      setMessages([...newMessages, { role: 'assistant', userLabel: 'AI Assistant', content: aiAnswer }])
    } catch (err) {
      const fallback = getGroundedAnswer(question)
      setMessages([...newMessages, { role: 'assistant', userLabel: 'AI Assistant', content: fallback }])
    } finally {
      setLoading(false)
    }
  }

  function getGroundedAnswer(q) {
    const lower = q.toLowerCase()
    if (lower.includes('normaliz')) {
      return 'Normalization is the systematic process of organizing data in a database to reduce data redundancy and improve data integrity. Normal forms include 1NF, 2NF, 3NF, and BCNF.'
    }
    if (lower.includes('acid') || lower.includes('transaction')) {
      return 'ACID properties guarantee reliability in database transactions: Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrent safety), and Durability (permanent storage).'
    }
    return `Based on "${selectedDoc}", the section explains structured data management, relational algebra, and schema design for college examination assessments.`
  }

  return (
    <div className="lms-view-modal-overlay">
      <div className="lms-view-full-app">
        {/* Left LMS Subject Sidebar matching Screenshot 6 */}
        <aside className="lms-view-sidebar">
          <div className="lms-sidebar-logo">
            <span className="logo-grad-icon">🎓</span> EduExam AI
          </div>

          <button className="back-subjects-btn" onClick={onClose}>
            ← Back to Subjects
          </button>

          <div className="active-subject-header">DBMS</div>

          <nav className="lms-subject-nav">
            <button
              className={`sub-nav-item ${activeSubTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'course-materials' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('course-materials')}
            >
              📄 Course Materials
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'question-papers' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('question-papers')}
            >
              📝 Question Papers
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'practice-tests' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('practice-tests')}
            >
              ✍️ Practice Tests
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'ai-assistant' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('ai-assistant')}
            >
              🤖 AI Assistant
            </button>
          </nav>
        </aside>

        {/* Main Content Pane */}
        <div className="lms-view-main-pane">
          {/* Main Header Bar */}
          <header className="lms-view-header">
            <div className="lms-header-search">
              <span>🔍</span>
              <input type="text" placeholder="Search in DBMS..." />
            </div>

            <div className="lms-doc-heading-title">
              {material?.title || 'DBMS - Unit 1: Introduction to DBMS'}
            </div>

            <div className="lms-header-actions">
              <button className="ask-ai-top-btn" onClick={() => handleSend('Summarize Unit 1 key points')}>
                🤖 Ask AI
              </button>
              <button className="lms-close-x-btn" onClick={onClose}>✕</button>
            </div>
          </header>

          {/* Split View: Left PDF Viewer Toolbar & Document Page | Right AI Study Assistant */}
          <div className="lms-split-container">
            {/* Left: Interactive PDF Viewer */}
            <div className="pdf-viewer-workspace">
              {/* Toolbar matching Screenshot 6 */}
              <div className="pdf-toolbar-bar">
                <div className="pdf-nav-controls">
                  <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>◄</button>
                  <span className="page-num-text">{currentPage} / {totalPages}</span>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>►</button>
                </div>

                <div className="pdf-zoom-controls">
                  <button onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}>-</button>
                  <span>{zoomLevel}%</span>
                  <button onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}>+</button>
                </div>

                <div className="pdf-tool-icons">
                  <span className="pdf-tool-icon" title="Bookmark">🔖</span>
                  <span className="pdf-tool-icon" title="Search">🔍</span>
                  <span className="pdf-tool-icon" title="Full Screen">⛶</span>
                </div>
              </div>

              {/* Rendered PDF Page Container */}
              <div className="pdf-canvas-scroll">
                <div className="pdf-page-sheet" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
                  <div className="pdf-chapter-header">1. Introduction to DBMS</div>
                  
                  <div className="pdf-body-prose">
                    <p>
                      Database Management Systems (DBMS) are software packages designed to define, manipulate, retrieve and manage data in a database. A DBMS manipulates the data itself, the data format, field names, record structure and file structure.
                    </p>

                    <p><strong>Benefits of DBMS:</strong></p>
                    <ul>
                      <li>Data independence from hardware and physical storage.</li>
                      <li>Data integrity constraints and crash recovery.</li>
                      <li>Minimal data redundancy across enterprise applications.</li>
                      <li>Multi-user concurrency control and access privileges.</li>
                    </ul>

                    {/* Diagram Box */}
                    <div className="pdf-diagram-architecture-box">
                      <div className="diagram-title-label">Three-Schema DBMS Architecture</div>
                      <div className="diagram-flow-flex">
                        <div className="diagram-box-node">External Level (User Views)</div>
                        <div className="diagram-arrow">➔</div>
                        <div className="diagram-box-node active">Conceptual Level (Logical Schema)</div>
                        <div className="diagram-arrow">➔</div>
                        <div className="diagram-box-node">Internal Level (Physical Storage)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane: AI Study Assistant matching Screenshot 6 */}
            <div className="ai-study-assistant-pane">
              <div className="ai-pane-header">
                <div className="ai-pane-title">🤖 AI Study Assistant</div>
                <div className="ai-doc-picker-wrap">
                  <label>Documents</label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                  >
                    <option value="DBMS Unit 1.pdf">DBMS Unit 1.pdf</option>
                    <option value="DBMS Unit 2.pdf">DBMS Unit 2.pdf</option>
                    <option value="DBMS Unit 3.pdf">DBMS Unit 3.pdf</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="ai-chat-thread">
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble-row ${m.role}`}>
                    <div className="chat-user-label">{m.userLabel || (m.role === 'user' ? 'You' : 'AI Assistant')}</div>
                    <div className="chat-bubble-content">{m.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-bubble-row assistant">
                    <div className="chat-user-label">AI Assistant</div>
                    <div className="chat-bubble-content loading">🧠 Searching course material & retrieving grounded chunks...</div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Chat Input */}
              <form className="ai-chat-input-row" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Send a message..."
                />
                <button type="submit" disabled={loading || !input.trim()}>
                  Send ➔
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
