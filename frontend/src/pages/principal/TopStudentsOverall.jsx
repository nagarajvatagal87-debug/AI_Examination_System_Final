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
          <h2 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>👑 Institution Top 10 Recognized Students</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Transferred top performers from HOD authorization workflows across all degree programs.
          </p>
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ width: 240, padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.85)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.18)' }}
        >
          <option value="">All Departments</option>
          {departments && departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>Loading top students...</p>
      ) : toppers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: 16 }}>No Transferred Top Students Yet</h4>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            Top student rankings will automatically reflect here as soon as Department HODs submit and transfer their top 10 authorization lists.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left', fontSize: 12 }}>
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
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: 12, fontWeight: 800, color: rank <= 3 ? '#f59e0b' : '#f8fafc' }}>#{rank}</td>
                  <td style={{ padding: 12, fontWeight: 600, color: '#f8fafc' }}>{name}</td>
                  <td style={{ padding: 12, color: '#94a3b8' }}>{regNo}</td>
                  <td style={{ padding: 12, fontWeight: 600, color: '#a5b4fc' }}>{dept}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#34d399' }}>{percentage}</td>
                  <td style={{ padding: 12, fontWeight: 700, color: '#38bdf8' }}>{cgpa}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
