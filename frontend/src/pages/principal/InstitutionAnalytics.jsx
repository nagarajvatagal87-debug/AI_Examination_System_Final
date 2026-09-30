import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function InstitutionAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicYear, setAcademicYear] = useState('2025–2026')
  const [semester, setSemester] = useState('')

  function loadAnalytics() {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (academicYear) params.append('academicYear', academicYear)
    if (semester) params.append('semester', semester)

    api.get(`/principal/analytics?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load institution analytics.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAnalytics()
  }, [academicYear, semester])

  if (loading) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
        <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Calculating database analytics...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center', background: '#fef2f2', border: '1.5px solid #dc2626' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontWeight: 800 }}>Unable to load institution analytics</h3>
        <p style={{ color: '#991b1b', fontSize: 13, margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
        <button onClick={loadAnalytics} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
      </div>
    )
  }

  const passRateDisplay = data?.overallPassRate || 'N/A'
  const cgpaDisplay = data?.averageCgpa || 'N/A'
  const internalCompDisplay = data?.internalCompletion || 'N/A'
  const mainCompDisplay = data?.mainExamCompletion || 'N/A'
  const grievanceDisplay = data?.grievanceResolutionRate || 'N/A'
  const facultyEvalDisplay = data?.facultyEvalCompletion || 'N/A'

  const cgpaDistribution = data?.cgpaDistribution || []
  const branchTrends = data?.branchTrends || []

  return (
    <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>📊 Institution Performance Analytics</h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, fontWeight: 600 }}>
            Quality assurance metrics calculated strictly from real database records.
          </p>
        </div>

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
        </div>
      </div>

      {/* Grid of Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, marginBottom: 28 }}>
        <div style={{ background: '#eff6ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 800 }}>Overall Pass Rate</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: passRateDisplay === 'N/A' ? '#64748b' : '#1d4ed8', marginTop: 4 }}>{passRateDisplay}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 700 }}>DB Main Results</div>
        </div>

        <div style={{ background: '#f5f3ff', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#5b21b6', fontWeight: 800 }}>Average Student CGPA</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: cgpaDisplay === 'N/A' ? '#64748b' : '#6d28d9', marginTop: 4 }}>{cgpaDisplay}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 700 }}>Scale 10.0</div>
        </div>

        <div style={{ background: '#ecfdf5', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 800 }}>Internal Evaluation Completion</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: internalCompDisplay === 'N/A' ? '#64748b' : '#047857', marginTop: 4 }}>{internalCompDisplay}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 700 }}>50-Mark Continuous Assessment</div>
        </div>

        <div style={{ background: '#fffbeb', padding: 18, borderRadius: 12, border: '1.5px solid #1e293b' }}>
          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 800 }}>Grievance Resolution Rate</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: grievanceDisplay === 'N/A' ? '#64748b' : '#b45309', marginTop: 4 }}>{grievanceDisplay}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 700 }}>Resolved Complaints</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Branch Trends */}
        <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, border: '1.5px solid #1e293b' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>Student Strength per Department</h4>
          {branchTrends.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>No department trend data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {branchTrends.map((b, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, fontWeight: 700 }}>
                    <span style={{ color: '#0f172a' }}>{b.branch}</span>
                    <span style={{ color: b.color, fontWeight: 800 }}>{b.rate} Students</span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 6, border: '1px solid #1e293b', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (b.rate / Math.max(1, data?.totalStudents || 1)) * 100)}%`, height: '100%', background: b.color, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CGPA Performance Distribution */}
        <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, border: '1.5px solid #1e293b' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>CGPA / Academic Performance Distribution</h4>
          {cgpaDistribution.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
              <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
                No academic performance data available yet. CGPA distribution will render automatically as soon as Main Examination results are published.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {cgpaDistribution.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #334155' }}>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.label}</span>
                  <strong style={{ color: item.color, fontWeight: 800 }}>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
