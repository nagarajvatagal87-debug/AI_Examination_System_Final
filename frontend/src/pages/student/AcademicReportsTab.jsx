import { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function AcademicReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeReportModal, setActiveReportModal] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/student/academic-reports')
      .then((res) => {
        if (Array.isArray(res.data)) setReports(res.data)
      })
      .catch((err) => console.error('Failed to load academic reports:', err))
      .finally(() => setLoading(false))
  }, [])

  function handlePrintReport() {
    window.print()
  }

  if (loading) {
    return (
      <div className="content-card" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        ⏳ Loading DB Academic Reports...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="content-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 900 }}>
            📑 Official Academic Reports & Transcripts
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Consolidated official academic documents, attendance logs, and internal assessment statements generated from institution database records.
          </p>
        </div>
        <span style={{ fontSize: 12, padding: '6px 14px', background: '#eff6ff', color: '#2563eb', fontWeight: 800, borderRadius: 20, border: '1px solid #bfdbfe' }}>
          {reports.length} Official Reports Available
        </span>
      </div>

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <div className="content-card" style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: 18, fontWeight: 800 }}>No academic reports are available yet.</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
            Official reports generate automatically once faculty publishes internal assessment marks or attendance records.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="content-card"
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                background: '#ffffff', borderRadius: 16, padding: 20
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 800 }}>
                    {rep.semester} · {rep.academicYear}
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 700, border: '1px solid #bbf7d0' }}>
                    {rep.status}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {rep.reportName}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {rep.summary}
                </p>
              </div>

              <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  Generated: {rep.generatedDate}
                </span>
                <button
                  onClick={() => setActiveReportModal(rep)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, background: '#0f172a', color: '#ffffff',
                    border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  👁️ View & Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Printable Report Modal */}
      {activeReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: '#ffffff', width: '100%', maxWidth: 800, maxHeight: '90vh',
            borderRadius: 16, overflowY: 'auto', padding: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: 20, color: '#0f172a'
          }}>
            {/* Modal Top Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div style={{ fontWeight: 800, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                OFFICIAL ACADEMIC DOCUMENT PREVIEW
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handlePrintReport}
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  onClick={() => setActiveReportModal(null)}
                  style={{ padding: '8px 14px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  ✖ Close
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="printable-academic-report" style={{ border: '2px solid #0f172a', padding: 24, borderRadius: 12, background: '#ffffff', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px double #0f172a', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
                  DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
                </div>
                <h2 style={{ margin: '4px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                  {activeReportModal.reportName}
                </h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Semester: {activeReportModal.semester} · Academic Term: {activeReportModal.academicYear} · Generated on {activeReportModal.generatedDate}
                </div>
              </div>

              {/* Summary Rows Table - Strictly constrained within inner box */}
              <div style={{ width: '100%', overflowX: 'auto', marginBottom: 20 }}>
                <table className="results-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {activeReportModal.dataRows?.[0] && Object.keys(activeReportModal.dataRows[0]).map((k) => (
                        <th key={k} style={{ textTransform: 'uppercase', fontSize: 10, padding: '8px 6px', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                          {k.replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReportModal.dataRows?.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, vIdx) => (
                          <td key={vIdx} style={{ fontSize: 12, fontWeight: vIdx === 0 ? 700 : 500, padding: '10px 6px', wordBreak: 'break-word' }}>
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Authorization Seal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  * This document is generated from official DSATM academic database records.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'serif', fontSize: 16, fontWeight: 800, fontStyle: 'italic', color: '#1e3a8a' }}>
                    Dr. Academic Controller
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', borderTop: '1px solid #0f172a', paddingTop: 2, marginTop: 2 }}>
                    DEAN OF ACADEMIC AFFAIRS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
