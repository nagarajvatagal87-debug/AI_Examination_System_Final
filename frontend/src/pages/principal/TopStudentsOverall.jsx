import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function TopStudentsOverall({ overview, departments }) {
  const [selectedDept, setSelectedDept] = useState('')
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
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
      .catch(() => setToppers([]))
      .finally(() => setLoading(false))
  }, [selectedDept])

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>👑 Institution Top 10 Recognized Students</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Transferred top performers from HOD authorization workflows across all degree programs.
          </p>
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ width: 240, padding: '10px 14px', borderRadius: 8, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
        >
          <option value="">All Departments</option>
          {departments && departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Loading top students...</p>
      ) : toppers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Transferred Top Students Yet</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, maxWidth: 480, marginInline: 'auto', fontWeight: 600 }}>
            Top student rankings will automatically reflect here as soon as Department HODs submit and transfer their top 10 authorization lists.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>RANK</th>
              <th style={{ padding: 12 }}>STUDENT NAME</th>
              <th style={{ padding: 12 }}>REG NO</th>
              <th style={{ padding: 12 }}>DEPARTMENT</th>
              <th style={{ padding: 12 }}>PERCENTAGE</th>
              <th style={{ padding: 12 }}>CGPA</th>
            </tr>
          </thead>
          <tbody>
            {toppers.map((t, idx) => {
              const rank = t.rank || idx + 1
              const name = t.fullName || t.name || t.profiles?.full_name || 'Student'
              const regNo = t.registrationNo || t.regNo || t.profiles?.registration_no || 'N/A'
              const dept = t.dept || t.department || 'Department'
              const percentage = typeof t.percentage === 'number' ? `${t.percentage}%` : t.percentage || 'N/A'
              const cgpa = t.cgpa || (typeof t.percentage === 'number' ? (t.percentage / 10).toFixed(1) : 'N/A')

              return (
                <tr key={idx}>
                  <td style={{ padding: 12, fontWeight: 900, color: rank <= 3 ? '#b45309' : '#0f172a' }}>#{rank}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#0f172a' }}>{name}</td>
                  <td style={{ padding: 12, color: '#475569', fontWeight: 600 }}>{regNo}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#1d4ed8' }}>{dept}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: '#047857' }}>{percentage}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: '#1d4ed8' }}>{cgpa}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
