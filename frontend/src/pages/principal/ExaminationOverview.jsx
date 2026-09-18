import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function ExaminationOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/principal/examination-overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const examsList = data?.exams || []
  const scheduledCount = data?.scheduledCount || 0
  const appearingStudents = data?.appearingStudents || 0
  const publishedCount = data?.publishedCount || 0

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#f8fafc' }}>⚖️ Institution-Level Examination Overview</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>
        Note: Per institutional policy, Main Examination evaluation and publication are strictly governed by the Examination Department.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Main Exams Scheduled</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>{scheduledCount} Examinations</div>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Students Appearing</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#c084fc', marginTop: 4 }}>{appearingStudents} Students</div>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.6)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Results Published</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', marginTop: 4 }}>{publishedCount} Published</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>Loading main examinations overview...</p>
      ) : examsList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: 16 }}>No Main Examinations Scheduled Yet</h4>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            Main examinations scheduled or published by the Examination Department will automatically appear here.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left', fontSize: 12 }}>
              <th style={{ padding: 12 }}>MAIN EXAMINATION</th>
              <th style={{ padding: 12 }}>DEPARTMENT</th>
              <th style={{ padding: 12 }}>SCHEDULED DATE</th>
              <th style={{ padding: 12 }}>STUDENTS</th>
              <th style={{ padding: 12 }}>AUTHORITY</th>
              <th style={{ padding: 12 }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {examsList.map((ex, idx) => {
              const statusClass = ex.status === 'In Evaluation' ? 'evaluation' : ex.status === 'Published' ? 'published' : 'scheduled'
              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: 12, fontWeight: 700, color: '#f8fafc' }}>{ex.title}</td>
                  <td style={{ padding: 12, color: '#a5b4fc', fontWeight: 600 }}>{ex.dept}</td>
                  <td style={{ padding: 12, color: '#94a3b8' }}>{ex.date}</td>
                  <td style={{ padding: 12, color: '#cbd5e1' }}>{ex.students}</td>
                  <td style={{ padding: 12, fontSize: 12, color: '#94a3b8' }}>{ex.evaluator}</td>
                  <td style={{ padding: 12 }}>
                    <span className={`badge-status ${statusClass}`}>
                      {ex.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
