import { useState, useEffect } from 'react'
import api from '../api/client.js'

export default function StudyMaterials({ subjectId }) {
  const [tab, setTab] = useState('course_pdf')
  const [materials, setMaterials] = useState([])

  useEffect(() => {
    if (!subjectId) return
    api.get(`/course-materials?subjectId=${subjectId}&kind=${tab}`)
      .then((res) => setMaterials(res.data))
      .catch(() => setMaterials([]))
  }, [subjectId, tab])

  async function download(id) {
    const { data } = await api.get(`/course-materials/${id}`)
    window.open(data.download_url, '_blank')
  }

  if (!subjectId) return <p style={{ color: '#888' }}>Select a subject to view materials.</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setTab('course_pdf')} style={{ fontWeight: tab === 'course_pdf' ? 700 : 400 }}>📘 Notes</button>
        <button onClick={() => setTab('previous_paper')} style={{ fontWeight: tab === 'previous_paper' ? 700 : 400 }}>📝 Previous Papers</button>
      </div>

      {materials.length === 0 ? (
        <p style={{ color: '#888' }}>Nothing uploaded here yet.</p>
      ) : (
        materials.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>{m.file_name}</span>
            <button onClick={() => download(m.id)}>Download</button>
          </div>
        ))
      )}
    </div>
  )
}