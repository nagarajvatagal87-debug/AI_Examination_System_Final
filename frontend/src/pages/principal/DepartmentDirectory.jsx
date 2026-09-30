import React from 'react'

export default function DepartmentDirectory({ deptStats, loading, error, onRetry }) {
  const displayList = deptStats || []

  if (loading) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🏛️</div>
        <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Loading department directory...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-panel glass-card" style={{ padding: 40, textAlign: 'center', background: '#fef2f2', border: '1.5px solid #dc2626' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontWeight: 800 }}>Unable to load department directory</h3>
        <p style={{ color: '#991b1b', fontSize: 13, margin: '0 0 16px 0', fontWeight: 600 }}>{error}</p>
        <button onClick={onRetry} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
      </div>
    )
  }

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>🏫 Department Directory & Academic Governance</h2>
          <p className="hint" style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Authorized department oversight, HOD details, faculty allocation, student strength, active subjects, and degree programs.
          </p>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏛️</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Departments Registered</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
            No department records detected in database.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: 12 }}>CODE</th>
              <th style={{ padding: 12 }}>DEPARTMENT NAME</th>
              <th style={{ padding: 12 }}>HEAD OF DEPARTMENT (HOD)</th>
              <th style={{ padding: 12 }}>FACULTY</th>
              <th style={{ padding: 12 }}>STUDENTS</th>
              <th style={{ padding: 12 }}>ACTIVE SUBJECTS</th>
              <th style={{ padding: 12 }}>ACADEMIC YEAR</th>
              <th style={{ padding: 12 }}>PLACEMENT %</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: 14, fontWeight: 900, color: '#1d4ed8' }}>{d.code || 'DEPT'}</td>
                <td style={{ padding: 14, fontWeight: 800, color: '#0f172a' }}>{d.name}</td>
                <td style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{d.hod_name || 'Not assigned'}</div>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{d.hod_email || 'No email'}</div>
                </td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.teacher_count ?? 'N/A'} Faculty</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.student_count ?? 'N/A'} Students</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#5b21b6' }}>{d.active_subjects ?? 'N/A'} Subjects</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#047857' }}>{d.academic_year || '2025–2026'}</td>
                <td style={{ padding: 14, fontWeight: 800, color: d.placement_percentage != null ? '#047857' : '#64748b' }}>
                  {d.placement_percentage != null ? `${d.placement_percentage}%` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
