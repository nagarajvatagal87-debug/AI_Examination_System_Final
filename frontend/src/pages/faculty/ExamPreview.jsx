import { useEffect, useState } from 'react'
import api from '../../api/client.js'
import './ExamPreview.css'

export default function ExamPreview({ examId }) {
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editMarks, setEditMarks] = useState(10)
  const [editCo, setEditCo] = useState('CO1')
  const [editRbt, setEditRbt] = useState('L1')
  const [exporting, setExporting] = useState(false)

  // Question Paper Security States
  const [securityStatus, setSecurityStatus] = useState(null)
  const [verifiedCode, setVerifiedCode] = useState(() => sessionStorage.getItem(`exam_sec_${examId}`) || '')
  const [isLocked, setIsLocked] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [showInputCode, setShowInputCode] = useState(false)
  const [passcodeError, setPasscodeError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Configure / Change Passcode Modal
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configNewCode, setConfigNewCode] = useState('')
  const [configOldCode, setConfigOldCode] = useState('')
  const [showConfigCode, setShowConfigCode] = useState(false)
  const [configMsg, setConfigMsg] = useState({ text: '', error: false })
  const [savingCode, setSavingCode] = useState(false)

  async function load(codeOverride) {
    setLoading(true)
    setError('')
    setPasscodeError('')

    const codeToUse = codeOverride !== undefined ? codeOverride : (verifiedCode || sessionStorage.getItem(`exam_sec_${examId}`) || '')

    try {
      // 1. Fetch exam metadata and security status
      const [examRes, secRes] = await Promise.all([
        api.get(`/exams/${examId}`).catch(() => ({ data: null })),
        api.get(`/faculty/exams/${examId}/security-status`).catch(() => ({ data: null }))
      ])

      if (examRes?.data) setExam(examRes.data)
      const secInfo = secRes?.data || { hasSecurityCode: examRes?.data?.hasSecurityCode || false, isSecured: examRes?.data?.isSecured || false }
      setSecurityStatus(secInfo)

      // 2. If paper is locked with security code and no verified passcode is provided yet
      if (secInfo.hasSecurityCode && !codeToUse) {
        setIsLocked(true)
        setLoading(false)
        return
      }

      // 3. Fetch questions with security header
      const headers = codeToUse ? { 'x-security-code': codeToUse } : {}
      const qRes = await api.get(`/faculty/exams/${examId}/questions`, { headers })

      setQuestions(qRes.data || [])
      setIsLocked(false)
      if (codeToUse) {
        setVerifiedCode(codeToUse)
        sessionStorage.setItem(`exam_sec_${examId}`, codeToUse)
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.data?.error === 'SECURED_QUESTION_PAPER') {
        setIsLocked(true)
        setPasscodeError(err.response?.data?.message || 'Confidential question paper: 4 or 6-digit security code required.')
        sessionStorage.removeItem(`exam_sec_${examId}`)
        setVerifiedCode('')
      } else {
        setError(err.response?.data?.error || 'Failed to load question paper preview')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (examId) load()
  }, [examId])

  async function handleUnlockPasscode(e) {
    if (e) e.preventDefault()
    const clean = inputCode.trim()
    if (!clean || (clean.length !== 4 && clean.length !== 6)) {
      setPasscodeError('Please enter a valid 4 or 6-digit security code.')
      return
    }

    setVerifying(true)
    setPasscodeError('')
    try {
      const res = await api.post(`/faculty/exams/${examId}/verify-security-code`, { securityCode: clean })
      if (res.data?.verified) {
        setVerifiedCode(clean)
        sessionStorage.setItem(`exam_sec_${examId}`, clean)
        setIsLocked(false)
        setInputCode('')
        await load(clean)
      } else {
        setPasscodeError(res.data?.error || 'Incorrect security code. Access denied.')
      }
    } catch (err) {
      setPasscodeError(err.response?.data?.error || err.response?.data?.message || 'Incorrect security code. Access denied.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSaveSecurityCode(e) {
    if (e) e.preventDefault()
    const cleanNew = configNewCode.trim()
    if (!cleanNew || (cleanNew.length !== 4 && cleanNew.length !== 6)) {
      setConfigMsg({ text: 'Security code must be exactly 4 or 6 digits / characters.', error: true })
      return
    }

    setSavingCode(true)
    setConfigMsg({ text: 'Saving confidential security code...', error: false })
    try {
      await api.post(`/faculty/exams/${examId}/set-security-code`, {
        securityCode: cleanNew,
        oldSecurityCode: configOldCode.trim(),
      })
      sessionStorage.setItem(`exam_sec_${examId}`, cleanNew)
      setVerifiedCode(cleanNew)
      setIsLocked(false)
      setConfigMsg({ text: '✓ Security code configured successfully! Question paper is now secured.', error: false })
      setTimeout(() => {
        setShowConfigModal(false)
        setConfigNewCode('')
        setConfigOldCode('')
        setConfigMsg({ text: '', error: false })
        load(cleanNew)
      }, 700)
    } catch (err) {
      setConfigMsg({ text: err.response?.data?.error || 'Failed to update security code', error: true })
    } finally {
      setSavingCode(false)
    }
  }

  function handleLockView() {
    sessionStorage.removeItem(`exam_sec_${examId}`)
    setVerifiedCode('')
    setIsLocked(true)
    setInputCode('')
    setPasscodeError('')
  }

  function startEdit(q) {
    setEditingId(q.id)
    setEditText(q.question_text)
    setEditMarks(q.marks)
    setEditCo(q.co || 'CO1')
    setEditRbt(q.rbt || 'L1')
  }

  async function saveEdit(id) {
    try {
      const headers = verifiedCode ? { 'x-security-code': verifiedCode } : {}
      await api.patch(`/faculty/questions/${id}`, {
        questionText: editText,
        marks: Number(editMarks),
        co: editCo,
        rbt: editRbt
      }, { headers })
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save edits')
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this question? It will be removed from the paper.')) return
    try {
      const headers = verifiedCode ? { 'x-security-code': verifiedCode } : {}
      await api.delete(`/faculty/questions/${id}`, { headers })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject question')
    }
  }

  async function handleExportPdf() {
    setExporting(true)
    setError('')
    try {
      const headers = verifiedCode ? { 'x-security-code': verifiedCode } : {}
      const { data } = await api.post(`/faculty/exams/${examId}/export-pdf`, { securityCode: verifiedCode }, { headers })
      const url = data.download_url
      
      const win = window.open(url, '_blank')
      if (win) win.focus()

      const a = document.createElement('a')
      a.href = url
      a.download = `Question-Paper-${examId.slice(0, 8)}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'PDF export failed')
    } finally {
      setExporting(false)
    }
  }

  const subjectName = exam?.subjects?.name || exam?.subjectName || 'Subject'
  const subjectCode = exam?.subjects?.code || exam?.subjectCode || 'ACAD'
  const examTitle = exam?.title || 'Second Internal Assessment Test (IAT-2)'
  const maxMarks = exam?.total_marks || 50

  // Render Configure / Reset Security Code Modal
  const renderConfigModal = () => {
    if (!showConfigModal) return null
    return (
      <div className="ep-modal-overlay" onClick={() => setShowConfigModal(false)}>
        <div className="ep-modal-card" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              🔒 {securityStatus?.hasSecurityCode ? 'Change Question Paper Security Code' : 'Set 4 or 6-Digit Security Code'}
            </h3>
            <button
              onClick={() => setShowConfigModal(false)}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Configure a confidential 4 or 6-digit passcode for <strong>{examTitle} ({subjectCode})</strong>. Only users with this code can view or print the questions.
          </p>

          {configMsg.text && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: configMsg.error ? '#fef2f2' : '#ecfdf5', color: configMsg.error ? '#b91c1c' : '#047857', border: `1px solid ${configMsg.error ? '#fecaca' : '#a7f3d0'}`, fontSize: 13, fontWeight: 700 }}>
              {configMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveSecurityCode}>
            {securityStatus?.hasSecurityCode && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Current Security Code (if already set)
                </label>
                <input
                  type="password"
                  placeholder="Enter current code"
                  value={configOldCode}
                  onChange={(e) => setConfigOldCode(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                New Security Code (4 or 6 Digits)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfigCode ? 'text' : 'password'}
                  placeholder="e.g. 8492 or 749201"
                  value={configNewCode}
                  onChange={(e) => setConfigNewCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 800, letterSpacing: showConfigCode ? '3px' : '4px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfigCode(!showConfigCode)}
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}
                >
                  {showConfigCode ? '👁️' : '🔒'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#64748b' }}>
                <span style={{ color: configNewCode.length === 4 || configNewCode.length === 6 ? '#059669' : '#d97706', fontWeight: 700 }}>
                  {configNewCode.length === 4 || configNewCode.length === 6 ? '✓ Valid (4 or 6 digits)' : 'Must be 4 or 6 digits'}
                </span>
                <span>{configNewCode.length} / 6 digits</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCode || (configNewCode.length !== 4 && configNewCode.length !== 6)}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                {savingCode ? 'Saving...' : '🔒 Save Security Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // 1. Loading State
  if (loading) return <p className="ep-empty-text">Loading question paper preview...</p>

  // 2. High-Security Clearance Gate Screen (When Paper is Locked)
  if (isLocked) {
    return (
      <div className="ep-container">
        <div className="ep-lock-wrapper">
          <div className="ep-lock-card">
            <div className="ep-lock-icon-bubble">🛡️</div>
            <span className="ep-lock-badge">🔒 CONFIDENTIAL QUESTION PAPER REPOSITORY</span>
            
            <h3 className="ep-lock-title">Security Code Clearance Required</h3>
            <p className="ep-lock-subtitle">
              This internal assessment question paper is confidential. To prevent unauthorized student or peer viewing, you must enter the 4 or 6-digit security code configured for this paper.
            </p>

            <div className="ep-lock-meta-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Subject:</span>
                <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{subjectName} ({subjectCode})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Examination:</span>
                <span style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 700 }}>{examTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Security Status:</span>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 800 }}>
                  🔒 {securityStatus?.codeLength ? `${securityStatus.codeLength}-Digit Passcode Protected` : 'Passcode Protected'}
                </span>
              </div>
            </div>

            {passcodeError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: 'left' }}>
                ⚠️ {passcodeError}
              </div>
            )}

            <form onSubmit={handleUnlockPasscode}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, textAlign: 'left' }}>
                  Enter 4 or 6-Digit Security Code
                </label>
                <div className="ep-lock-pin-wrap">
                  <input
                    type={showInputCode ? 'text' : 'password'}
                    className="ep-lock-pin-input"
                    placeholder="• • • •"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowInputCode(!showInputCode)}
                    style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
                    title={showInputCode ? 'Hide Code' : 'Show Code'}
                  >
                    {showInputCode ? '👁️' : '🔒'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', padding: '0 4px' }}>
                  <span>Must match code set during paper generation</span>
                  <span>{inputCode.length} / 6 digits</span>
                </div>
              </div>

              <button type="submit" className="ep-lock-btn" disabled={verifying || (inputCode.length !== 4 && inputCode.length !== 6)}>
                {verifying ? '🔒 Verifying Security Passcode...' : '🔓 Unlock & View Question Paper →'}
              </button>
            </form>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                ⚙️ Set or Reset Security Passcode
              </button>
            </div>
          </div>
        </div>

        {renderConfigModal()}
      </div>
    )
  }

  // 3. Unlocked Official Paper Sheet View
  return (
    <div className="ep-container">
      {/* Top Action Bar with Security Controls */}
      <div className="ep-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 className="ep-title">
            📋 Internal Assessment Question Paper
            <span className="ep-count-pill">{questions.length} Questions</span>
          </h2>
          {securityStatus?.hasSecurityCode ? (
            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              🔒 Passcode Verified (Confidential)
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ⚠️ Security Code Not Set
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="ep-btn-download" onClick={handleExportPdf} disabled={exporting || questions.length === 0}>
            {exporting ? 'Generating PDF...' : '🖨️ Download / Print Official Paper PDF'}
          </button>
          
          {securityStatus?.hasSecurityCode && (
            <button
              onClick={handleLockView}
              style={{ padding: '10px 16px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Lock view so questions cannot be seen by others"
            >
              🔒 Lock View
            </button>
          )}

          <button
            onClick={() => setShowConfigModal(true)}
            style={{ padding: '10px 14px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Set or change 4/6-digit security code"
          >
            🔑 {securityStatus?.hasSecurityCode ? 'Change Code' : 'Set Code'}
          </button>
        </div>
      </div>

      {/* Legacy paper security notice if code not set */}
      {!securityStatus?.hasSecurityCode && (
        <div style={{ marginBottom: 20, padding: '12px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong style={{ color: '#92400e', fontSize: 13, display: 'block' }}>🛡️ Protect This Question Paper:</strong>
            <span style={{ color: '#b45309', fontSize: 12 }}>
              This question paper currently has no 4 or 6-digit security code. Any logged-in user can view these questions. Set a security passcode to lock it.
            </span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            style={{ padding: '6px 14px', background: '#d97706', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
          >
            🔒 Set 4 or 6-Digit Code Now
          </button>
        </div>
      )}

      {error && <div className="ep-status-error">{error}</div>}

      {/* Official Institutional Document Preview Box */}
      <div className="ep-paper-sheet">
        {/* Header with DSI Logo on Left & VTU Logo on Right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #000000', paddingBottom: 14, marginBottom: 16, gap: 16 }}>
          <img src="/dsi-logo.png" alt="DSI Logo" style={{ height: 68, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 className="ep-inst-title" style={{ margin: 0, fontSize: 17, fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: 0.5 }}>
              DAYANANDA SAGAR ACADEMY OF TECHNOLOGY & MANAGEMENT
            </h1>
            <p className="ep-inst-sub" style={{ margin: '2px 0 0 0', fontSize: 11, fontStyle: 'italic', fontWeight: 700, color: '#111111' }}>
              (An Autonomous Institute Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi)
            </p>
            <p className="ep-inst-sub" style={{ margin: '1px 0 0 0', fontSize: 10.5, fontStyle: 'italic', color: '#111111' }}>
              Kanakapura Road, Opp. Art of Living, Udayapura, Bengaluru - 560082 | NAAC Accredited 'A+'
            </p>
            <p className="ep-inst-sub" style={{ margin: '1px 0 0 0', fontSize: 10, color: '#333333', fontWeight: 600 }}>
              4 Programs Accredited by NBA (CSE, ISE, ECE, ME)
            </p>
            <h3 className="ep-dept-title" style={{ margin: '6px 0 2px 0', fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
              DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS
            </h3>
            <h4 className="ep-exam-title" style={{ margin: '4px 0 0 0', fontSize: 14.5, fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
              {examTitle}
            </h4>
          </div>
          <img src="/vtu-logo.png" alt="VTU Logo" style={{ height: 64, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        </div>

        {/* Metadata Grid Box */}
        <table className="ep-meta-table">
          <tbody>
            <tr>
              <td className="ep-meta-lbl">Subject:</td>
              <td className="ep-meta-val"><strong>{subjectName}</strong></td>
              <td className="ep-meta-lbl">Subject Code:</td>
              <td className="ep-meta-val"><strong>{subjectCode}</strong></td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Semester:</td>
              <td className="ep-meta-val">02</td>
              <td className="ep-meta-lbl">Max. Marks:</td>
              <td className="ep-meta-val"><strong>{maxMarks}</strong></td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Batch:</td>
              <td className="ep-meta-val">2025-2027</td>
              <td className="ep-meta-lbl">Duration:</td>
              <td className="ep-meta-val">90min</td>
            </tr>
            <tr>
              <td className="ep-meta-lbl">Date of IAT:</td>
              <td className="ep-meta-val">{new Date().toLocaleDateString('en-GB')}</td>
              <td className="ep-meta-lbl">Teaching Dept:</td>
              <td className="ep-meta-val">MCA</td>
            </tr>
            <tr>
              <td colSpan="4" className="ep-rbt-bar">
                <strong>RBT Levels:</strong> L1-Remember, L2-Understand, L3-Apply, L4-Analyze, L5-Evaluate, L6-Create
              </td>
            </tr>
          </tbody>
        </table>

        {/* Instructions Box */}
        <div className="ep-instructions-box" style={{ background: '#fafafa', border: '1px solid #000000', padding: '8px 12px', fontWeight: 800, fontSize: 13, marginBottom: 16, color: '#000000' }}>
          Instruction: Answer the following questions choosing one from each option (e.g., 1 OR 2, 3 OR 4, 5 OR 6, 7 OR 8, 9 OR 10)
        </div>

        {/* Questions Table Grid */}
        {questions.length === 0 ? (
          <p className="ep-empty-text">No questions generated yet.</p>
        ) : (
          <table className="ep-q-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Q No</th>
                <th>Questions</th>
                <th style={{ width: '60px' }}>Marks</th>
                <th style={{ width: '65px' }}>COs</th>
                <th style={{ width: '65px' }}>RBTL</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.flatMap((q, idx) => {
                const isEvenOrRow = idx % 2 === 0 && idx < questions.length - 1
                const isEditing = editingId === q.id

                const rowElements = [
                  <tr key={q.id}>
                    {isEditing ? (
                      <td colSpan="6" className="ep-edit-cell">
                        <div className="ep-edit-box">
                          <div className="ep-edit-header">Edit Question Q{q.question_no || idx + 1}</div>
                          <textarea
                            className="ep-edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                          />
                          <div className="ep-edit-controls">
                            <label>Marks:
                              <input
                                type="number"
                                className="ep-edit-num"
                                value={editMarks}
                                onChange={(e) => setEditMarks(e.target.value)}
                              />
                            </label>
                            <label>CO:
                              <select className="ep-edit-select" value={editCo} onChange={(e) => setEditCo(e.target.value)}>
                                <option value="CO1">CO1</option>
                                <option value="CO2">CO2</option>
                                <option value="CO3">CO3</option>
                                <option value="CO4">CO4</option>
                                <option value="CO5">CO5</option>
                              </select>
                            </label>
                            <label>RBTL:
                              <select className="ep-edit-select" value={editRbt} onChange={(e) => setEditRbt(e.target.value)}>
                                <option value="L1">L1</option>
                                <option value="L2">L2</option>
                                <option value="L3">L3</option>
                                <option value="L4">L4</option>
                                <option value="L5">L5</option>
                                <option value="L6">L6</option>
                              </select>
                            </label>
                            <button className="ep-btn-save" onClick={() => saveEdit(q.id)}>Save</button>
                            <button className="ep-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="col-qno">{q.question_no || idx + 1}</td>
                        <td className="col-text">{q.question_text}</td>
                        <td className="col-marks">{q.marks}</td>
                        <td className="col-co">{q.co || `CO${((Math.floor(idx / 2) % 4) + 1)}`}</td>
                        <td className="col-rbt">{q.rbt || `L${((Math.floor(idx / 2) % 4) + 1)}`}</td>
                        <td className="col-actions">
                          <button className="ep-sm-btn ep-btn-edit" onClick={() => startEdit(q)} title="Edit Question">✏️</button>
                          <button className="ep-sm-btn ep-btn-reject" onClick={() => handleReject(q.id)} title="Delete Question">🗑️</button>
                        </td>
                      </>
                    )}
                  </tr>
                ]

                if (isEvenOrRow && !isEditing) {
                  rowElements.push(
                    <tr key={`or-${q.id}`} className="ep-or-row">
                      <td colSpan="6" style={{ textAlign: 'center', fontWeight: '900', letterSpacing: '4px', background: '#f8fafc', padding: '6px', fontSize: '13px', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                        OR
                      </td>
                    </tr>
                  )
                }

                return rowElements
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Change/Set Security Code Modal */}
      {renderConfigModal()}
    </div>
  )
}
