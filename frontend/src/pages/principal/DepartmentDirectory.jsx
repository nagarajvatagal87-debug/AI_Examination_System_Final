import React from 'react'

export default function DepartmentDirectory({ deptStats }) {
  const displayList = deptStats || []

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>🏛️ Department Directory & Governance</h2>
          <p className="hint" style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
            Authorized department oversight, HOD details, faculty allocation, student strength, and placement indicators.
          </p>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #1e293b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏛️</div>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16, fontWeight: 800 }}>No Departments Found</h4>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
            No department records detected in database. Create departments in administration to manage governance.
          </p>
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%', fontSize: 14 }}>
          <thead>
            <tr>
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
              <tr key={d.id}>
                <td style={{ padding: 14, fontWeight: 800, color: '#0f172a' }}>{d.name}</td>
                <td style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{d.hod_name || 'Not assigned'}</div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{d.hod_email || 'No email registered'}</div>
                </td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.teacher_count || 0} Teachers</td>
                <td style={{ padding: 14, fontWeight: 700, color: '#0f172a' }}>{d.student_count || 0} Students</td>
                <td style={{ padding: 14, fontWeight: 800, color: '#047857' }}>{d.placement_percentage != null ? `${d.placement_percentage}%` : 'N/A'}</td>
                <td style={{ padding: 14, fontWeight: 800, color: '#b45309' }}>{d.highest_package != null ? `₹${d.highest_package}` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
