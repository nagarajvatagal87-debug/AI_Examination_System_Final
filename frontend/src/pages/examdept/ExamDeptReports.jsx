import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function ExamDeptReports() {
  const [reportType, setReportType] = useState('RESULTS')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function fetchReports(type) {
    setLoading(true)
    setError('')
    api.get(`/examdept/reports?type=${type}`)
      .then((res) => setReports(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports(reportType)
  }, [reportType])

  function handleExportCSV() {
    if (!reports.length) return alert('No report data to export.')
    const headers = Object.keys(reports[0]).join(',')
    const rows = reports.map((row) => Object.values(row).map((val) => `"${val}"`).join(','))
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Main_Exam_Report_${reportType}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="pd-panel glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#f8fafc', fontWeight: 800 }}>📑 Main Examination Official Reports</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
              Generate, preview, and export official reports driven directly by live database records.
            </p>
          </div>
          <button className="pd-btn" onClick={handleExportCSV} style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', fontWeight: 800 }}>
            📥 Export CSV Report
          </button>
        </div>

        {/* Report Type selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'RESULTS', label: '📊 Results & Marks Summary' },
            { id: 'ROSTERS', label: '📋 Department Student Rosters' },
            { id: 'SCRIPTS', label: '📦 Answer Script Tracking' },
            { id: 'REVALUATION', label: '🔄 Revaluation Applications' },
          ].map((tab) => (
            <button
              key={tab.id}
              className="pd-btn"
              style={{
                background: reportType === tab.id ? '#0284c7' : 'rgba(15, 23, 42, 0.6)',
                color: reportType === tab.id ? '#fff' : '#94a3b8',
                border: reportType === tab.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                fontWeight: 700,
              }}
              onClick={() => setReportType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Report Content */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Generating report preview from database...</div>
        ) : error ? (
          <div style={{ padding: 20, background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: 8 }}>{error}</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.3)', borderRadius: 12 }}>
            📑 No records found for selected report category ({reportType}).
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pd-table">
              <thead>
                <tr>
                  {Object.keys(reports[0]).map((key) => (
                    <th key={key} style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} style={{ fontSize: 13, color: cIdx === 0 ? '#38bdf8' : '#cbd5e1', fontWeight: cIdx === 0 ? 800 : 500 }}>
                        {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '-')}
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
