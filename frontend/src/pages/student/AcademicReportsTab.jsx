import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import DocumentQrBadge from '../../components/DocumentQrBadge.jsx'

export default function AcademicReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeReportModal, setActiveReportModal] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/profile').catch(() => ({ data: null })),
      api.get('/student/academic-profile').catch(() => ({ data: null }))
    ]).then(([profileRes, acadRes]) => {
      const pData = profileRes.data || {}
      const aData = acadRes.data || {}
      setProfile({
        ...pData,
        ...aData,
        studentName: aData.studentName || pData.full_name || 'Student Candidate',
        registrationNo: aData.registrationNo || pData.registration_no || '1DS23MCA01',
        departmentName: aData.departmentName || pData.departments?.name || 'Department of Computer Applications (MCA)',
      })
    })

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
                border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
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
          background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: '#f8fafc', width: '100%', maxWidth: 860, maxHeight: '92vh',
            borderRadius: 20, overflowY: 'auto', padding: 28, border: '1px solid #cbd5e1',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.35)',
            display: 'flex', flexDirection: 'column', gap: 18, color: '#0f172a'
          }}>
            {/* Modal Top Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📜</span>
                <span style={{ fontWeight: 900, color: '#0f172a', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  OFFICIAL ACADEMIC DOCUMENT PREVIEW
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handlePrintReport}
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  onClick={() => setActiveReportModal(null)}
                  style={{ padding: '8px 14px', background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  ✖ Close
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="printable-academic-report" style={{ border: '2px solid #0f172a', padding: 32, borderRadius: 14, background: '#ffffff', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
              {/* Header Letterhead with DSI & VTU Logos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, marginBottom: 20, borderBottom: '2.5px solid #0f172a', gap: 16 }}>
                <img src="/dsi-logo.png" alt="DSI Logo" style={{ height: 60, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
                  </h2>
                  <div style={{ fontSize: 10.5, color: '#334155', fontWeight: 700, marginTop: 2 }}>
                    (An Autonomous Institute Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi)
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                    Kanakapura Road, Opp. Art of Living, Udayapura, Bengaluru - 560082 | NAAC Accredited 'A+'
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1d4ed8', marginTop: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {activeReportModal.reportName || "OFFICIAL ACADEMIC STATEMENT"}
                  </div>
                </div>
                <img src="/vtu-logo.png" alt="VTU Logo" style={{ height: 56, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
              </div>

              {/* Student Candidate Identity Box */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14, background: '#f8fafc', padding: '16px 20px', borderRadius: 10,
                border: '1.5px solid #cbd5e1', marginBottom: 22, boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
              }}>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    👤 Candidate Name
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: 14, fontWeight: 900 }}>
                    {profile?.studentName || profile?.full_name || 'Student Candidate'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    🆔 USN / Registration No
                  </span>
                  <strong style={{ color: '#1d4ed8', fontSize: 14, fontWeight: 900, fontFamily: 'monospace' }}>
                    {profile?.registrationNo || profile?.registration_no || '1DS23MCA01'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    🏛️ Department & Program
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>
                    {profile?.departmentName || profile?.department_name || 'Department of Computer Applications (MCA)'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    📅 Semester & Term
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>
                    Semester: {activeReportModal.semester || profile?.semester || '3rd Sem'} (2026-2027)
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    📅 Generated Date
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>
                    {activeReportModal.generatedDate || '4 Oct 2026'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 3 }}>
                    🔒 Document Verification Status
                  </span>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 900, border: '1px solid #86efac'
                  }}>
                    ✓ OFFICIAL VERIFIED DATABASE RECORD
                  </span>
                </div>
              </div>

              {/* Summary Rows Table - Clean, structured with proper padding and badge colors */}
              <div style={{ width: '100%', overflowX: 'auto', marginBottom: 22, border: '1.5px solid #0f172a', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
                      {activeReportModal.dataRows?.[0] && Object.keys(activeReportModal.dataRows[0]).map((k) => (
                        <th key={k} style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800, padding: '10px 8px', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                          {k.replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReportModal.dataRows?.map((row, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {Object.entries(row).map(([key, val], vIdx) => {
                          const valStr = String(val);
                          const isEligibilityOrResult = key === 'eligibility' || key === 'result' || key === 'status';
                          
                          let cellContent = valStr;
                          if (isEligibilityOrResult) {
                            const isGood = valStr.includes('ELIGIBLE') || valStr.includes('PASSED') || valStr.includes('HOD Approved') || valStr.includes('OFFICIAL');
                            cellContent = (
                              <span style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800,
                                background: isGood ? '#dcfce7' : '#fee2e2', color: isGood ? '#15803d' : '#b91c1c',
                                border: isGood ? '1px solid #86efac' : '1px solid #fca5a5', whiteSpace: 'nowrap', display: 'inline-block'
                              }}>
                                {valStr}
                              </span>
                            );
                          } else if (key === 'totalScore' || key === 'totalMarks' || key === 'percentage') {
                            cellContent = (
                              <strong style={{ color: '#1d4ed8', fontWeight: 900, fontSize: 12.5 }}>
                                {valStr}
                              </strong>
                            );
                          }

                          return (
                            <td key={vIdx} style={{ fontSize: 11.5, fontWeight: vIdx === 0 ? 800 : 500, padding: '10px 8px', whiteSpace: key === 'subject' ? 'normal' : 'nowrap', color: '#1e293b' }}>
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Authorization Seal & Verification QR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 20, borderTop: '1.5px solid #0f172a' }}>
                <div style={{ fontSize: 11, color: '#64748b', maxWidth: 240, lineHeight: 1.4 }}>
                  🔒 <strong>Authoritative Institutional Record</strong><br />
                  Generated directly from official DSATM academic database records.
                </div>
                <DocumentQrBadge
                  documentId={`${activeReportModal.id || 'report'}-${profile?.registrationNo || profile?.registration_no || profile?.id || 'student'}`}
                  documentType="ACADEMIC_REPORT"
                  documentTitle={activeReportModal.reportName || "Official Academic Report"}
                  studentName={profile?.studentName || profile?.full_name || "Student Candidate"}
                  usn={profile?.registrationNo || profile?.registration_no || "USN Pending"}
                  departmentName={profile?.departmentName || profile?.department_name || "Department of Computer Applications (MCA)"}
                  academicYear={activeReportModal.academicYear || "2026-2027"}
                />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'serif', fontSize: 15, fontWeight: 800, fontStyle: 'italic', color: '#1e3a8a' }}>
                    Dr. Academic Controller
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', borderTop: '1px solid #0f172a', paddingTop: 2, marginTop: 2, fontWeight: 700 }}>
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

