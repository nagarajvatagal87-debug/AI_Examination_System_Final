import { useState, useEffect } from 'react'
import axios from 'axios'
import PublicChatbot from '../../components/PublicChatbot.jsx'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export default function CollegeInfo() {
  const [overview, setOverview] = useState(null)
  const [departments, setDepartments] = useState([])
  const [deptInfo, setDeptInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    publicApi.get('/public/college-info').then((res) => setOverview(res.data.overview))
    publicApi.get('/public/departments').then((res) => setDepartments(res.data))
  }, [])

  async function selectDepartment(id) {
    setError('')
    try {
      const { data } = await publicApi.get(`/public/departments/${id}`)
      setDeptInfo(data)
    } catch (err) {
      setDeptInfo(null)
      setError(err.response?.data?.error || 'No public information available for this department.')
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <h1>{overview?.name || 'College Information'}</h1>
      {overview?.description && <p>{overview.description}</p>}

      <h2>Departments</h2>
      <select onChange={(e) => selectDepartment(e.target.value)} defaultValue="">
        <option value="" disabled>Select a department</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {deptInfo && (
        <div style={{ marginTop: 16 }}>
          <h3>{deptInfo.departments?.name}</h3>
          <p>{deptInfo.about}</p>
          <p><strong>Students:</strong> {deptInfo.student_count}</p>
          <p><strong>Courses:</strong> {deptInfo.courses?.join(', ')}</p>
          <p><strong>Placement:</strong> {deptInfo.placement_percentage}% placed —
             highest ₹{deptInfo.highest_package}, average ₹{deptInfo.average_package}</p>
          {deptInfo.achievements?.length > 0 && (
            <>
              <strong>Achievements:</strong>
              <ul>{deptInfo.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </>
          )}
        </div>
      )}

      <PublicChatbot />
    </div>
  )
}