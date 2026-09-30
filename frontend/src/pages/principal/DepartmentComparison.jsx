import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function DepartmentComparison({ departments }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicYear, setAcademicYear] = useState('2025–2026')
  const [semester, setSemester] = useState('')
  const [selectedDept, setSelectedDept] = useState('')

  function loadComparison() {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (academicYear) params.append('academicYear', academicYear)
    if (semester) params.append('semester', semester)
    if (selectedDept) params.append('departmentId', selectedDept)

    api.get(`/principal/comparison?${params.toString()}`)
      .then((res) => setData(res.data || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load department comparison.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadComparison()
  }, [academicYear, semester, selectedDept])

  return (
    <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>⚖️ Department Indicator Comparison</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, fontWeight: 600 }}>
            Comparative academic indicators calculated across departments from live database records.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
            <option value="2025–2026">Academic Year 2025–2026</option>
            <option value="2024–2025">Academic Year 2024–2025</option>
          </select>

          <select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
            <option value="">All Semesters</option>
            <option value="1st Sem">1st Sem</option>
            <option value="2nd Sem">2nd Sem</option>
            <option value="3rd Sem">3rd Sem</option>
            <option value="4th Sem">4th Sem</option>
          </select>

          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
            <option value="">All Departments</option>
            {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Comparing department indicators...</p>
      ) : error ? (
        <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
          <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
          <button onClick={loadComparison} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>Insufficient Data to Compare</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
            No department records available matching the selected filters.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>DEPARTMENT</th>
              <th style={{ padding: 12 }}>STUDENTS</th>
              <th style={{ padding: 12 }}>FACULTY</th>
              <th style={{ padding: 12 }}>INTERNAL PASS RATE</th>
              <th style={{ padding: 12 }}>MAIN EXAM PASS RATE</th>
              <th style={{ padding: 12 }}>BACKLOG COUNT</th>
              <th style={{ padding: 12 }}>AVG CGPA</th>
              <th style={{ padding: 12 }}>EVALUATION COMPLETION</th>
              <th style={{ padding: 12 }}>ATTENDANCE COMPLIANCE</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td style={{ padding: 14, fontWeight: 800, color: '#0f172a' }}>{d.department}</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.studentCount ?? 'N/A'}</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.facultyCount ?? 'N/A'}</td>
                <td style={{ padding: 14, fontWeight: 800, color: '#047857' }}>{d.internalPassRate}</td>
                <td style={{ padding: 14, fontWeight: 800, color: d.color || '#1d4ed8' }}>{d.mainPassRate}</td>
                <td style={{ padding: 14, fontWeight: 800, color: d.backlogs > 0 ? '#dc2626' : '#047857' }}>
                  {d.backlogs != null ? `${d.backlogs} Backlogs` : 'N/A'}
                </td>
                <td style={{ padding: 14, fontWeight: 800, color: '#1d4ed8' }}>{d.avgCgpa}</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#5b21b6' }}>{d.evalCompletion}</td>
                <td style={{ padding: 14, fontWeight: 800, color: '#047857' }}>{d.attendanceCompliance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
