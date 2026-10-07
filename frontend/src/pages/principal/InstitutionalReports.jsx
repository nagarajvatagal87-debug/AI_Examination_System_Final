import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function InstitutionalReports({ departments }) {
  const [reportType, setReportType] = useState('student_roster')
  const [selectedDept, setSelectedDept] = useState(() => localStorage.getItem('principal_selected_dept_id') || '')

  useEffect(() => {
    if (selectedDept !== null) {
      localStorage.setItem('principal_selected_dept_id', selectedDept)
    }
  }, [selectedDept])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function generateReport() {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    params.append('reportType', reportType)
    if (selectedDept) params.append('departmentId', selectedDept)

    api.get(`/principal/reports?${params.toString()}`)
      .then((res) => setReportData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to generate report.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    generateReport()
  }, [reportType, selectedDept])

  function downloadCSV() {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) return
    const keys = Object.keys(reportData.rows[0])
    const csvContent = [
      keys.join(','),
      ...reportData.rows.map((row) => keys.map((k) => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, margin: 0, color: '#0f172a', fontWeight: 800 }}>📑 Institutional Academic Reports Generator</h2>
            <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0 0', fontWeight: 600 }}>
              Generate comprehensive database-backed reports for audits, VTU compliance, department rosters, attendance, pass/fail trends, and top performers.
            </p>
          </div>

          <button
            onClick={downloadCSV}
            disabled={!reportData || !reportData.rows || reportData.rows.length === 0}
            className="pd-btn"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', fontWeight: 800 }}
          >
            📥 Download CSV Report
          </button>
        </div>

        {/* Report Filter Controls */}
        <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, border: '1.5px solid #334155', display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Report Type:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ width: '100%', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
            >
              <option value="student_roster">Department Student Roster Report</option>
              <option value="internal_assessment">Internal Assessment 50-Mark Report</option>
              <option value="attendance">Department Attendance & Shortage Report</option>
              <option value="faculty_workload">Faculty Workload & Subject Assignment Report</option>
              <option value="top_students">Top 10 Merit Students Transferred Report</option>
            </select>
          </div>

          <div style={{ width: 260 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Department Filter:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ width: '100%', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}
            >
              <option value="">All Departments</option>
              {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <button onClick={generateReport} className="pd-btn" style={{ marginTop: 18, background: '#1e293b', border: 'none' }}>
            🔄 Regenerate
          </button>
        </div>

        {/* Report Output Display */}
        {loading ? (
          <p style={{ color: '#475569', padding: 20, textAlign: 'center' }}>Generating database report...</p>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #dc2626' }}>
            <p style={{ color: '#b91c1c', margin: '0 0 10px 0', fontWeight: 700 }}>{error}</p>
            <button onClick={generateReport} className="pd-btn" style={{ background: '#dc2626', border: 'none' }}>Retry</button>
          </div>
        ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #1e293b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📑</div>
            <h4 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: 16, fontWeight: 800 }}>No Records Found for Selected Report</h4>
            <p style={{ color: '#475569', fontSize: 13, margin: 0, fontWeight: 600 }}>
              The database returned 0 matching records for this report criteria. Select a different department or report type.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>{reportData.title}</h4>
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 800, background: '#ecfdf5', padding: '4px 10px', borderRadius: 12, border: '1px solid #059669' }}>
                Total Records: {reportData.totalRecords}
              </span>
            </div>

            <table className="pd-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  {Object.keys(reportData.rows[0]).map((col, idx) => (
                    <th key={idx} style={{ padding: 12 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} style={{ padding: 12, fontWeight: cIdx === 0 ? 800 : 500 }}>
                        {String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
