import React from 'react'

export default function DepartmentDirectory({ deptStats }) {
  const displayList = deptStats || []

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>🏛️ Department Directory & Governance</h2>
          <p className="hint" style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Authorized department oversight, HOD details, faculty allocation, student strength, and placement indicators.
          </p>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏛️</div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: 16 }}>No Departments Found</h4>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            No department records detected in database. Create departments in administration to manage governance.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left', fontSize: 12 }}>
              <th style={{ padding: 12 }}>DEPARTMENT</th>
              <th style={{ padding: 12 }}>HEAD OF DEPARTMENT (HOD)</th>
              <th style={{ padding: 12 }}>FACULTY</th>
              <th style={{ padding: 12 }}>STUDENTS</th>
              <th style={{ padding: 12 }}>PLACEMENT %</th>
              <th style={{ padding: 12 }}>HIGHEST PACKAGE</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: 14, fontWeight: 700, color: '#f8fafc' }}>{d.name}</td>
                <td style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, color: '#38bdf8' }}>{d.hod_name || 'Not assigned'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.hod_email || 'No email registered'}</div>
                </td>
                <td style={{ padding: 14, fontWeight: 600, color: '#cbd5e1' }}>{d.teacher_count || 0} Teachers</td>
                <td style={{ padding: 14, fontWeight: 600, color: '#cbd5e1' }}>{d.student_count || 0} Students</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#34d399' }}>{d.placement_percentage != null ? `${d.placement_percentage}%` : 'N/A'}</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#fbbf24' }}>{d.highest_package != null ? `₹${d.highest_package}` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
