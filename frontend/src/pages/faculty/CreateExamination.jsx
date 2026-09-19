import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client.js'
import './CreateExamination.css'

const ALL_UNITS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5']

export default function CreateExamination() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [materials, setMaterials] = useState([])
  const [courseMaterialId, setCourseMaterialId] = useState('')
  const [examType, setExamType] = useState('internal-1')
  const [totalMarks, setTotalMarks] = useState(50)
  const [pattern, setPattern] = useState([{ marks: 2, count: 5 }, { marks: 5, count: 4 }])
  const [difficulty, setDifficulty] = useState('medium')
  const [units, setUnits] = useState(['Unit 1', 'Unit 2'])
  const [instructions, setInstructions] = useState('')
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

  function toggleUnit(unit) {
    setUnits(units.includes(unit) ? units.filter((u) => u !== unit) : [...units, unit])
  }

  const patternTotal = pattern.reduce((sum, p) => sum + p.marks * p.count, 0)

  async function handleGenerate() {
    if (!subjectId) return setMsg('Please create or select a subject first.')
    if (patternTotal !== Number(totalMarks)) {
      return setMsg(`Question pattern totals ${patternTotal} marks, but Total Marks is specified as ${totalMarks} marks. They must match.`)
    }

    setLoading(true)
    setMsg('Generating questions with AI — this may take a moment...')
    try {
      const { data } = await api.post('/faculty/exams', {
        subjectId,
        courseMaterialId,
        type: examType,
        title: `${examType.replace('-', ' ')} Examination`,
        totalMarks: Number(totalMarks),
        questionPattern: pattern,
        difficulty,
        units,
        instructions,
      })
      setMsg('Question paper generated!')
      navigate(`/faculty/examinations/${data.exam.id}/preview`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ce-wrap">
      <h2 className="ce-title">Create Examination</h2>

      <div className="ce-field">
        <label>Subject</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="ce-field">
        <label>Course Material</label>
        <select value={courseMaterialId} onChange={(e) => setCourseMaterialId(e.target.value)}>
          {materials.length === 0 && <option value="">No course material uploaded yet</option>}
          {materials.map((m) => <option key={m.id} value={m.id}>{m.file_name}</option>)}
        </select>
      </div>

      <div className="ce-field">
        <label>Examination Type</label>
        <select value={examType} onChange={(e) => setExamType(e.target.value)}>
          <option value="internal-1">Internal-1</option>
          <option value="internal-2">Internal-2</option>
          <option value="internal-3">Internal-3</option>
        </select>
      </div>

      <div className="ce-field">
        <label>Total Marks</label>
        <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
      </div>

      <div className="ce-field">
        <label>Question Pattern <span className={patternTotal === Number(totalMarks) ? 'ce-match' : 'ce-mismatch'}>({patternTotal} / {totalMarks} marks)</span></label>
        {pattern.map((p, i) => (
          <div key={i} className="ce-pattern-row">
            <input type="number" value={p.marks} onChange={(e) => updatePattern(i, 'marks', e.target.value)} placeholder="Marks each" />
            <span>marks ×</span>
            <input type="number" value={p.count} onChange={(e) => updatePattern(i, 'count', e.target.value)} placeholder="Count" />
            <span>questions</span>
            <button type="button" className="ce-remove" onClick={() => removePatternRow(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="fd-btn fd-btn-secondary" onClick={addPatternRow}>+ Add row</button>
      </div>

      <div className="ce-field">
        <label>Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="ce-field">
        <label>Units</label>
        <div className="ce-units">
          {ALL_UNITS.map((u) => (
            <label key={u} className="ce-unit-checkbox">
              <input type="checkbox" checked={units.includes(u)} onChange={() => toggleUnit(u)} /> {u}
            </label>
          ))}
        </div>
      </div>

      <div className="ce-field">
        <label>Additional Instruction for AI</label>
        <textarea
          rows={3}
          placeholder='e.g. "Generate application-based questions from normalization and transaction management."'
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <button className="fd-btn ce-generate" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Question Paper'}
      </button>

      {msg && <p className="fd-status">{msg}</p>}
    </div>
  )
}