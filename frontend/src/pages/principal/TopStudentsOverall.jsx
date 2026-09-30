import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function TopStudentsOverall({ departments }) {
  const [selectedDept, setSelectedDept] = useState('')
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadTopStudents() {
    setLoading(true)
    setError('')
    const url = selectedDept
      ? `/principal/department-toppers?departmentId=${encodeURIComponent(selectedDept)}`
      : '/principal/department-toppers'

    api.get(url)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setToppers(res.data)
        } else {
          setToppers([])
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load top students.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTopStudents()
  }, [selectedDept])

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>🏆 Institution Top Recognized Students</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Transferred top performers authorized by Head of Department (HOD) evaluation & approval workflow.
          </p>
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ width: 240, padding: '10px 14px', borderRadius: 8, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
        >
          <option value="">All Departments</option>
          {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading transferred top students...</p>
      ) : error ? (
        <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
          <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
          <button onClick={loadTopStudents} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
        </div>
      ) : toppers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Transferred Top Students Yet</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, maxWidth: 480, marginInline: 'auto', fontWeight: 600 }}>
            Top student rankings will automatically reflect here as soon as Department HODs review, authorize, and submit their top 10 merit lists.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>RANK</th>
              <th style={{ padding: 12 }}>STUDENT NAME</th>
              <th style={{ padding: 12 }}>USN / REG NO</th>
              <th style={{ padding: 12 }}>DEPARTMENT</th>
              <th style={{ padding: 12 }}>PROGRAM</th>
              <th style={{ padding: 12 }}>SEMESTER</th>
              <th style={{ padding: 12 }}>ACADEMIC YEAR</th>
              <th style={{ padding: 12 }}>PERFORMANCE METRIC</th>
              <th style={{ padding: 12 }}>HOD STATUS</th>
              <th style={{ padding: 12 }}>TRANSFERRED DATE</th>
            </tr>
          </thead>
          <tbody>
            {toppers.map((t, idx) => {
              const rank = t.rank || idx + 1
              const name = t.fullName || t.name || t.profiles?.full_name || 'Student'
              const regNo = t.registrationNo || t.usn || t.regNo || t.profiles?.registration_no || 'N/A'
              const dept = t.dept || t.department || 'Department'
              const program = t.program || (dept.includes('MCA') ? 'MCA' : 'B.Tech')
              const sem = t.semester || '3rd Sem'
              const year = t.academicYear || '2025–2026'
              const metric = typeof t.percentage === 'number' ? `${t.percentage}%` : t.percentage || t.cgpa || 'N/A'
              const status = t.status || 'TRANSFERRED'
              const date = t.transferred_date || 'Recent'

              return (
                <tr key={idx}>
                  <td style={{ padding: 12, fontWeight: 900, color: rank <= 3 ? '#b45309' : '#0f172a' }}>#{rank}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: '#0f172a' }}>{name}</td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 700 }}>{regNo}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#1d4ed8' }}>{dept}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#5b21b6' }}>{program}</td>
                  <td style={{ padding: 12, color: '#0f172a', fontWeight: 600 }}>{sem}</td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 600 }}>{year}</td>
                  <td style={{ padding: 12, fontWeight: 900, color: '#047857' }}>{metric}</td>
                  <td style={{ padding: 12 }}>
                    <span className="badge-status done">★ {status}</span>
                  </td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 500 }}>{date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
