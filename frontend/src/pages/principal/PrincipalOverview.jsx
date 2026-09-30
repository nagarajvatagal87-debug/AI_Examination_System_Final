import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function PrincipalOverview({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState('2025–2026')
  const [departmentFilter, setDepartmentFilter] = useState('')

  function loadOverviewData() {
    setLoading(true)
    setError('')
    api.get('/principal/overview')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load institution overview from database.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOverviewData()
  }, [])

  const toppers = data?.department_toppers || []
  let departments = data?.departments || []
  if (departmentFilter) {
    departments = departments.filter((d) => d.id === departmentFilter)
  }

  const principalName = user?.fullName || 'Principal'

  if (loading) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
        <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Loading institution analytics...</h3>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 4, fontWeight: 600 }}>Fetching live database metrics for Principal Portal</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center', background: '#fef2f2', border: '1.5px solid #dc2626' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontWeight: 800 }}>Unable to load institution analytics</h3>
        <p style={{ color: '#991b1b', fontSize: 13, margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
        <button onClick={loadOverviewData} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>
          🔄 Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="principal-overview-wrap">
      {/* Welcome Header */}
      <div className="pd-panel glass-card" style={{ padding: '22px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Welcome, {principalName}! 👋
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Institution Governance & Database-Backed Performance Metrics
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontSize: 12, fontWeight: 700 }}
          >
            <option value="2025–2026">Academic Year 2025–2026</option>
            <option value="2024–2025">Academic Year 2024–2025</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontSize: 12, fontWeight: 700 }}
          >
            <option value="">All Departments</option>
            {(data?.departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* 8 Calculated DB Metric Cards */}
      <div className="pd-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="pd-stat-card purple glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🏛️</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#5b21b6', fontWeight: 900 }}>
              {data?.total_departments ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#6d28d9', fontWeight: 800 }}>Total Departments</div>
          </div>
        </div>

        <div className="pd-stat-card blue glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>👥</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#1d4ed8', fontWeight: 900 }}>
              {data?.total_students ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#1e40af', fontWeight: 800 }}>Total Students</div>
          </div>
        </div>

        <div className="pd-stat-card orange glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>👩‍🏫</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#b45309', fontWeight: 900 }}>
              {data?.total_faculty ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#92400e', fontWeight: 800 }}>Total Faculty</div>
          </div>
        </div>

        <div className="pd-stat-card green glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>👔</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#047857', fontWeight: 900 }}>
              {data?.active_hods ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#065f46', fontWeight: 800 }}>Active HODs</div>
          </div>
        </div>

        <div className="pd-stat-card blue glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>📝</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#1d4ed8', fontWeight: 900 }}>
              {data?.active_main_exams ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#1e40af', fontWeight: 800 }}>Main Examinations</div>
          </div>
        </div>

        <div className="pd-stat-card green glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>✅</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#047857', fontWeight: 900 }}>
              {data?.published_results ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#065f46', fontWeight: 800 }}>Published Results</div>
          </div>
        </div>

        <div className="pd-stat-card purple glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>⚖️</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#5b21b6', fontWeight: 900 }}>
              {data?.pending_approvals ?? "N/A"}
            </div>
            <div className="pd-stat-label" style={{ color: '#6d28d9', fontWeight: 800 }}>Pending Approvals</div>
          </div>
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Department Directory Overview */}
        <div className="pd-panel glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, margin: 0, color: '#0f172a', fontWeight: 800 }}>Department Strength Directory</h3>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Live Database Records</span>
          </div>

          {departments.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>No departments registered yet in database.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {departments.map((d, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>HOD: {d.hod_name || 'Not assigned'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: 15 }}>{d.student_count ?? 'N/A'} Students</div>
                    <div style={{ fontSize: 11, color: '#047857', fontWeight: 800 }}>Academic Active</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Transferred Students */}
        <div className="pd-panel glass-card">
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>Transferred Top Students (HOD Workflow)</h3>
          {toppers.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
              <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
                No transferred Top Students yet. Transferred rankings will appear here as soon as Department HODs submit them.
              </p>
            </div>
          ) : (
            <table className="pd-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: 10, textAlign: 'left' }}>#</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Dept</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {toppers.slice(0, 7).map((t, idx) => {
                  const rank = t.rank || idx + 1
                  const name = t.fullName || t.name || t.profiles?.full_name || 'Student'
                  const dept = t.dept || t.department || 'Department'
                  const score = typeof t.percentage === 'number' ? `${t.percentage}%` : t.percentage || 'N/A'
                  return (
                    <tr key={idx}>
                      <td style={{ padding: 10, fontWeight: 800, color: rank <= 3 ? '#b45309' : '#0f172a' }}>#{rank}</td>
                      <td style={{ padding: 10, fontWeight: 700, color: '#0f172a' }}>{name}</td>
                      <td style={{ padding: 10, color: '#334155', fontWeight: 500 }}>{dept}</td>
                      <td style={{ padding: 10, fontWeight: 800, color: '#047857' }}>{score}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
