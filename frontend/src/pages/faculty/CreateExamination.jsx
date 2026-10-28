import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './CreateExamination.css'

export default function CreateExamination() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [materials, setMaterials] = useState([])
  const [courseMaterialId, setCourseMaterialId] = useState('')
  const [examType, setExamType] = useState('internal-1')
  const [totalMarks, setTotalMarks] = useState(50)
  const [pattern, setPattern] = useState([{ marks: 10, count: 5 }])
  const [difficulty, setDifficulty] = useState('medium')
  const [instructions, setInstructions] = useState('')
  const [securityCode, setSecurityCode] = useState('')
  const [showSecurityCode, setShowSecurityCode] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    api.get('/subjects?mine=true').then((res) => {
      setSubjects(res.data)
      const preselect = searchParams.get('subjectId')
      if (preselect) setSubjectId(preselect)
      else if (res.data.length) setSubjectId(res.data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!subjectId) return
    api.get(`/course-materials?subjectId=${subjectId}&kind=course_pdf`).then((res) => {
      setMaterials(res.data)
      if (res.data.length) setCourseMaterialId(res.data[0].id)
    }).catch(() => {})
  }, [subjectId])

  function updatePattern(index, field, value) {
    const next = [...pattern]
    next[index] = { ...next[index], [field]: Number(value) }
    setPattern(next)
  }

  function addPatternRow() {
    setPattern([...pattern, { marks: 10, count: 1 }])
  }

  function removePatternRow(index) {
    setPattern(pattern.filter((_, i) => i !== index))
  }

  const patternTotal = pattern.reduce((sum, p) => sum + p.marks * p.count, 0)

  async function handleGenerate() {
    if (!subjectId) return setMsg('Please create or select a subject first.')
    const cleanSecCode = securityCode.trim()
    if (!cleanSecCode || (cleanSecCode.length !== 4 && cleanSecCode.length !== 6)) {
      return setMsg('🔒 Please set a confidential 4 or 6-digit security code to protect this question paper before generating.')
    }
    if (patternTotal !== Number(totalMarks)) {
      return setMsg(`Question pattern totals ${patternTotal} marks, but Total Marks is specified as ${totalMarks} marks. They must match.`)
    }

    setLoading(true)
    setMsg('Generating question paper with AI — this may take a moment...')
    try {
      const examTitleName = examType === 'internal-1' ? 'First Internal Assessment Test (IAT-1)'
        : examType === 'internal-2' ? 'Second Internal Assessment Test (IAT-2)'
        : 'Third Internal Assessment Test (IAT-3)'

      const { data } = await api.post('/faculty/exams', {
        subjectId,
        courseMaterialId,
        type: examType,
        title: examTitleName,
        totalMarks: Number(totalMarks),
        questionPattern: pattern,
        difficulty,
        instructions,
        securityCode: cleanSecCode,
      })
      setMsg('Question paper generated successfully!')
      if (data?.exam?.id) {
        sessionStorage.setItem(`exam_sec_${data.exam.id}`, cleanSecCode)
      }
      navigate(`/faculty/examinations/${data.exam.id}/preview`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ce-wrap">
      <div className="ce-header-banner">
        <div>
          <h2 className="ce-title">✨ AI Question Paper Generator</h2>
          <p className="ce-subtitle">Configure assessment parameters, syllabus notes, and question distribution.</p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, padding: '6px 14px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, border: '1px solid #bfdbfe' }}>
          🎓 DSATM Official Exam Module
        </span>
      </div>

      <div className="ce-section-title">📘 1. Subject & Syllabus Source</div>
      <div className="ce-field">
        <label>Subject</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code || 'MCA'})</option>)}
        </select>
      </div>

      <div className="ce-field">
        <label>Course Material PDF Document</label>
        <select value={courseMaterialId} onChange={(e) => setCourseMaterialId(e.target.value)}>
          {materials.length === 0 && <option value="">No course material uploaded yet</option>}
          {materials.map((m) => <option key={m.id} value={m.id}>{m.file_name || m.title}</option>)}
        </select>
      </div>

      <div className="ce-section-title">📝 2. Examination Config & Pattern</div>
      <div className="ce-field">
        <label>Examination Type</label>
        <select value={examType} onChange={(e) => setExamType(e.target.value)}>
          <option value="internal-1">Internal-1 (IAT-1)</option>
          <option value="internal-2">Internal-2 (IAT-2)</option>
          <option value="internal-3">Internal-3 (IAT-3)</option>
        </select>
      </div>

      <div className="ce-field">
        <label>Total Marks</label>
        <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
      </div>

      <div className="ce-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ margin: 0 }}>Question Pattern Distribution</label>
          <span className={patternTotal === Number(totalMarks) ? 'ce-match' : 'ce-mismatch'}>
            {patternTotal === Number(totalMarks) ? '✓ Matched' : '⚠️ Mismatch'}: {patternTotal} / {totalMarks} marks
          </span>
        </div>

        {pattern.map((p, i) => (
          <div key={i} className="ce-pattern-row">
            <input type="number" value={p.marks} onChange={(e) => updatePattern(i, 'marks', e.target.value)} placeholder="Marks" />
            <strong style={{ color: '#475569' }}>marks ×</strong>
            <input type="number" value={p.count} onChange={(e) => updatePattern(i, 'count', e.target.value)} placeholder="Count" />
            <strong style={{ color: '#475569' }}>questions</strong>
            <button type="button" className="ce-remove" onClick={() => removePatternRow(i)}>✕ Remove</button>
          </div>
        ))}

        <button type="button" onClick={addPatternRow} style={{ marginTop: 8, padding: '8px 16px', background: '#f1f5f9', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          + Add Question Row
        </button>
      </div>

      <div className="ce-field">
        <label>Difficulty Level</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy (Foundational Concepts)</option>
          <option value="medium">Medium (Balanced Analysis & Application)</option>
          <option value="hard">Hard (Advanced Problem Solving & Design)</option>
        </select>
      </div>

      <div className="ce-section-title">🤖 3. AI Prompt Instructions</div>
      <div className="ce-field">
        <label>Additional Guidance for AI Question Generation</label>
        <textarea
          rows={3}
          placeholder='e.g. "Generate application-based questions from normalization and transaction management with diagram prompts."'
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="ce-section-title">🔒 4. Confidential Question Paper Security Passcode</div>
      <div className="ce-field">
        <label>Set 4 or 6-Digit Security Passcode (Required)</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type={showSecurityCode ? 'text' : 'password'}
            placeholder="Enter 4 or 6-digit security code (e.g. 7492 or 849201)"
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6))}
            maxLength={6}
            style={{ paddingRight: 45, letterSpacing: showSecurityCode ? '3px' : '4px', fontWeight: 'bold' }}
          />
          <button
            type="button"
            onClick={() => setShowSecurityCode(!showSecurityCode)}
            style={{
              position: 'absolute',
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#64748b',
              padding: 4,
            }}
            title={showSecurityCode ? 'Hide Code' : 'Show Code'}
          >
            {showSecurityCode ? '👁️' : '🔒'}
          </button>
        </div>

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: securityCode.length === 4 || securityCode.length === 6 ? '#059669' : '#d97706', fontWeight: 700 }}>
            {securityCode.length === 0
              ? 'ℹ️ Code must be exactly 4 or 6 digits'
              : securityCode.length === 4
              ? '✓ 4-Digit Security Code (Standard Protection)'
              : securityCode.length === 6
              ? '✓ 6-Digit Security Code (High Security Protection)'
              : `⚠️ Must be 4 or 6 digits (currently ${securityCode.length} digits)`}
          </span>
          <span style={{ color: '#64748b', fontWeight: 600 }}>{securityCode.length} / 6 digits</span>
        </div>

        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          🛡️ <strong>Main Examination Confidentiality Protocol:</strong> Question papers are encrypted upon generation. Once configured, only authorized personnel entering this 4 or 6-digit security code will be granted access to view, preview, or print this paper.
        </div>
      </div>

      <button className="ce-generate" onClick={handleGenerate} disabled={loading}>
        {loading ? '🧠 Generating Question Paper via AI...' : '⚡ Generate AI Question Paper'}
      </button>

      {msg && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: msg.includes('successfully') ? '#dcfce7' : '#fee2e2', color: msg.includes('successfully') ? '#15803d' : '#b91c1c', fontWeight: 700, fontSize: 13, border: msg.includes('successfully') ? '1px solid #86efac' : '1px solid #fca5a5' }}>{msg}</div>}
    </div>
  )
}
