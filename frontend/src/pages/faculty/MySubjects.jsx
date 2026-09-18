import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client.js'
import './MySubjects.css'

export default function MySubjects() {
  const [subjects, setSubjects] = useState([])
  const [materialsFor, setMaterialsFor] = useState(null)
  const [materials, setMaterials] = useState([])
  const [uploadFile, setUploadFile] = useState(null)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/subjects?mine=true').then((res) => setSubjects(res.data)).catch(() => {})
  }, [])

  function openMaterials(subject) {
    setMaterialsFor(subject)
    api.get(`/course-materials?subjectId=${subject.id}&kind=course_pdf`)
      .then((res) => setMaterials(res.data))
      .catch(() => {})
  }

  async function handleUpload() {
    if (!uploadFile || !materialsFor) return
    setMsg('Uploading...')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('subjectId', materialsFor.id)
      formData.append('kind', 'course_pdf')
      await api.post('/faculty/course-materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg('Uploaded — ingestion running in background.')
      setUploadFile(null)
      openMaterials(materialsFor)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Upload failed')
    }
  }

  return (
    <div>
      <h2 className="ms-title">My Subjects</h2>

      <div className="ms-grid">
        {subjects.map((s) => (
          <div key={s.id} className="ms-card">
            <div className="ms-name">{s.name}</div>
            <div className="ms-code">{s.code || '—'}</div>
            <div className="ms-actions">
              <button className="fd-btn fd-btn-secondary" onClick={() => openMaterials(s)}>Course Materials</button>
              <button className="fd-btn" onClick={() => navigate(`/faculty/examinations?subjectId=${s.id}`)}>Examinations</button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <p className="hint">No subjects assigned to you yet.</p>}
      </div>

      {materialsFor && (
        <div className="ms-materials-panel">
          <div className="ms-materials-header">
            <h3>{materialsFor.name} — Course Materials</h3>
            <button className="ms-close" onClick={() => setMaterialsFor(null)}>✕</button>
          </div>
          <ul className="ms-materials-list">
            {materials.map((m) => (
              <li key={m.id}>📄 {m.file_name} <span className="ms-date">{new Date(m.created_at).toLocaleDateString()}</span></li>
            ))}
            {materials.length === 0 && <li className="hint">No materials uploaded yet.</li>}
          </ul>
          <div className="fd-form-row">
            <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} />
            <button className="fd-btn" onClick={handleUpload}>+ Upload Material</button>
          </div>
          {msg && <p className="fd-status">{msg}</p>}
        </div>
      )}
    </div>
  )
}