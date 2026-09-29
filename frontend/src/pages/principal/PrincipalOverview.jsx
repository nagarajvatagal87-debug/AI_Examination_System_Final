import React from 'react'

export default function PrincipalOverview({ overview, deptStats, user }) {
  const toppers = overview?.department_toppers || []
  const departments = overview?.departments || deptStats || []

  const totalDepts = departments.length
  const totalStudents = deptStats?.reduce((sum, d) => sum + (d.student_count || 0), 0) || 0
  const totalFaculty = deptStats?.reduce((sum, d) => sum + (d.teacher_count || 0), 0) || 0

  const principalName = user?.fullName || 'Principal'

  return (
    <div className="principal-overview-wrap">
      {/* Welcome Header */}
      <div className="pd-panel glass-card" style={{ padding: '22px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Welcome, {principalName}! 👋
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Overall Institution Performance, Department Analytics & Academic Governance
          </p>
        </div>
        <div style={{ background: '#eff6ff', color: '#1e40af', border: '1.5px solid #1e40af', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
          Academic Year 2025–2026
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="pd-stats-row">
        <div className="pd-stat-card purple glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🏛️</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#5b21b6', fontWeight: 900 }}>{totalDepts}</div>
            <div className="pd-stat-label" style={{ color: '#6d28d9', fontWeight: 800 }}>Departments</div>
          </div>
        </div>

        <div className="pd-stat-card blue glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>👥</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#1d4ed8', fontWeight: 900 }}>{totalStudents}</div>
            <div className="pd-stat-label" style={{ color: '#1e40af', fontWeight: 800 }}>Total Registered Students</div>
          </div>
        </div>

        <div className="pd-stat-card green glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🎯</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#047857', fontWeight: 900 }}>{toppers.length > 0 ? "Active" : "Pending"}</div>
            <div className="pd-stat-label" style={{ color: '#065f46', fontWeight: 800 }}>HOD Approvals Status</div>
          </div>
        </div>

        <div className="pd-stat-card orange glass-card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>👩‍🏫</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#b45309', fontWeight: 900 }}>{totalFaculty}</div>
            <div className="pd-stat-label" style={{ color: '#92400e', fontWeight: 800 }}>Total Faculty</div>
          </div>
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Department Strength & Governance */}
        <div className="pd-panel glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, margin: 0, color: '#0f172a', fontWeight: 800 }}>Department Strength Directory</h3>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Live Database Overview</span>
          </div>

          {departments.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>No departments registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {departments.map((d, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>HOD: {d.hod_name || 'Not assigned'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: 15 }}>{d.student_count || 0} Students</div>
                    <div style={{ fontSize: 11, color: '#047857', fontWeight: 800 }}>Governance Active</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Transferred Students */}
        <div className="pd-panel glass-card">
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>Transferred Top Students (HOD Approvals)</h3>
          {toppers.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
              <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
                No top students transferred yet by HODs. Transferred rankings will appear here as soon as HODs submit them.
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
