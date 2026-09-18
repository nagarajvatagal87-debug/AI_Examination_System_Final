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
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Welcome, {principalName}! 👋
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Overall Institution Performance, Department Analytics & Academic Governance
          </p>
        </div>
        <div style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          Academic Year 2025–2026
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="pd-stats-row">
        <div className="pd-stat-card glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>🏛️</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#38bdf8' }}>{totalDepts}</div>
            <div className="pd-stat-label">Departments</div>
          </div>
        </div>

        <div className="pd-stat-card glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>👥</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#c084fc' }}>{totalStudents}</div>
            <div className="pd-stat-label">Total Registered Students</div>
          </div>
        </div>

        <div className="pd-stat-card green glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>🎯</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#34d399' }}>{toppers.length > 0 ? "Active" : "Pending"}</div>
            <div className="pd-stat-label">HOD Approvals Status</div>
          </div>
        </div>

        <div className="pd-stat-card orange glass-card">
          <div style={{ fontSize: 20, marginBottom: 8 }}>👩‍🏫</div>
          <div>
            <div className="pd-stat-num" style={{ color: '#fb923c' }}>{totalFaculty}</div>
            <div className="pd-stat-label">Total Faculty</div>
          </div>
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Department Strength & Governance */}
        <div className="pd-panel glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, margin: 0, color: '#f8fafc' }}>Department Strength Directory</h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Live Database Overview</span>
          </div>

          {departments.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No departments registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {departments.map((d, idx) => (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>HOD: {d.hod_name || 'Not assigned'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 15 }}>{d.student_count || 0} Students</div>
                    <div style={{ fontSize: 11, color: '#34d399' }}>Governance Active</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Transferred Students */}
        <div className="pd-panel glass-card">
          <h3 style={{ fontSize: 18, margin: '0 0 16px 0', color: '#f8fafc' }}>Transferred Top Students (HOD Approvals)</h3>
          {toppers.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 10, border: '1px border-dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                No top students transferred yet by HODs. Transferred rankings will appear here as soon as HODs submit them.
              </p>
            </div>
          ) : (
            <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
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
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: 10, fontWeight: 800, color: rank <= 3 ? '#f59e0b' : '#f8fafc' }}>#{rank}</td>
                      <td style={{ padding: 10, fontWeight: 600, color: '#f8fafc' }}>{name}</td>
                      <td style={{ padding: 10, color: '#94a3b8' }}>{dept}</td>
                      <td style={{ padding: 10, fontWeight: 700, color: '#34d399' }}>{score}</td>
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
