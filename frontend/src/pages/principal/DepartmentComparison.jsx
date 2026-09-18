import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function DepartmentComparison() {
  const [data, setData] = useState([])

  useEffect(() => {
    api.get('/principal/comparison')
      .then((res) => setData(res.data || []))
      .catch(() => {})
  }, [])

  const defaultComp = [
    { department: 'MCA (Computer Applications)', passRate: '88%', backlogs: 12, placement: '92%', avgCgpa: '8.4', color: '#3b82f6' },
    { department: 'CSE (Computer Science Eng)', passRate: '86%', backlogs: 14, placement: '94%', avgCgpa: '8.3', color: '#10b981' },
    { department: 'ECE (Electronics & Comm)', passRate: '80%', backlogs: 18, placement: '90%', avgCgpa: '8.1', color: '#ec4899' },
    { department: 'MBA (Business Administration)', passRate: '78%', backlogs: 22, placement: '88%', avgCgpa: '7.9', color: '#8b5cf6' },
    { department: 'BCA (Computer Applications)', passRate: '75%', backlogs: 25, placement: '85%', avgCgpa: '7.6', color: '#06b6d4' },
    { department: 'B.Sc (Computer Science)', passRate: '68%', backlogs: 32, placement: '75%', avgCgpa: '7.2', color: '#f59e0b' },
  ]

  const displayList = data.length > 0 ? data : defaultComp

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#f8fafc' }}>📊 Department Indicator Comparison</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px 0' }}>
        Side-by-side comparative analysis of academic pass rates, backlog counts, placement percentages, and average CGPAs.
      </p>

      <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left', fontSize: 12 }}>
            <th style={{ padding: 12 }}>DEPARTMENT</th>
            <th style={{ padding: 12 }}>PASS RATE</th>
            <th style={{ padding: 12 }}>BACKLOG COUNT</th>
            <th style={{ padding: 12 }}>PLACEMENT RATE</th>
            <th style={{ padding: 12 }}>AVERAGE CGPA</th>
            <th style={{ padding: 12 }}>GOVERNANCE RATING</th>
          </tr>
        </thead>
        <tbody>
          {displayList.map((d, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: 14, fontWeight: 700, color: '#f8fafc' }}>{d.department}</td>
              <td style={{ padding: 14, fontWeight: 700, color: d.color || '#38bdf8' }}>{d.passRate}</td>
              <td style={{ padding: 14, fontWeight: 700, color: d.backlogs > 20 ? '#f87171' : '#fb923c' }}>{d.backlogs} Backlogs</td>
              <td style={{ padding: 14, fontWeight: 700, color: '#34d399' }}>{d.placement}</td>
              <td style={{ padding: 14, fontWeight: 700, color: '#38bdf8' }}>{d.avgCgpa}</td>
              <td style={{ padding: 14 }}>
                <span className="badge-status done">★ Excellent</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
