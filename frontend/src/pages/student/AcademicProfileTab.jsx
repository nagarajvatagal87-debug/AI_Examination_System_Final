import { useState, useEffect } from 'react'
import api from '../../api/client.js'
import DocumentQrBadge from '../../components/DocumentQrBadge.jsx'

export default function AcademicProfileTab() {
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/student/academic-profile')
      .then((res) => {
        if (res.data) setProfileData(res.data)
      })
      .catch((err) => {
        console.error('Failed to load academic profile:', err)
        setError('Unable to load academic profile from database.')
      })
      .finally(() => setLoading(false))
  }, [])

  function handlePrintTranscript() {
    window.print()
  }

  if (loading) {
    return (
      <div className="content-card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Loading DSATM Student Academic Profile...</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Fetching official database registration, attendance logs & scorecards.</div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="content-card" style={{ padding: 36, textAlign: 'center', color: '#ef4444' }}>
        ⚠️ {error || 'Academic profile information is not available.'}
      </div>
    )
  }

  const {
    studentName,
    registrationNo,
    email,
    program,
    departmentName,
    semester,
    section,
    academicYear,
    enrollmentStatus,
    avatarUrl,
    summary,
    subjectSummary,
  } = profileData

  const activeUsn = registrationNo || 'USN Pending'
  const activeEmail = email || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Printable Institution Official Header with Logos (Only visible during print) */}
      <div className="print-only-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '2px solid #0f172a' }}>
          <img src="/dsi-logo.png" alt="DSI Logo" style={{ height: 54, width: 'auto', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT
            </h2>
            <div style={{ fontSize: 10.5, color: '#334155', fontWeight: 700, marginTop: 2 }}>
              (An Autonomous Institute Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi)
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
              Kanakapura Road, Opp. Art of Living, Udayapura, Bengaluru - 560082 | NAAC Accredited 'A+'
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1d4ed8', marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              OFFICIAL STUDENT ACADEMIC PROFILE & TRANSCRIPT RECORD
            </div>
          </div>
          <img src="/vtu-logo.png" alt="VTU Logo" style={{ height: 50, width: 'auto', objectFit: 'contain' }} />
        </div>
      </div>

      {/* 1. Official Header Banner & Identity */}
      <div className="academic-header-card">
        {/* Decorative background glow */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
              background: '#2563eb', color: '#ffffff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 900,
              border: '3.5px solid #38bdf8', boxShadow: '0 6px 18px rgba(37,99,235,0.45)', flexShrink: 0
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (studentName?.[0] || 'S')
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  🎓 DSATM OFFICIAL ACADEMIC IDENTITY
                </span>
                <span style={{ background: '#10b981', color: '#ffffff', fontSize: 10, fontWeight: 900, padding: '2px 10px', borderRadius: 12, letterSpacing: 0.5 }}>
                  ✓ VERIFIED
                </span>
              </div>
              <h2 style={{ margin: '2px 0 4px 0', fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5 }}>
                {studentName || 'Student'}
              </h2>
              <div style={{ fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>USN / Reg No: <strong style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: 15 }}>{activeUsn}</strong></span>
                <span>•</span>
                <span>{departmentName}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <span style={{
              padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 800,
              background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)',
              letterSpacing: 0.5
            }}>
              ● {enrollmentStatus || 'ACTIVE / REGULAR'}
            </span>
            <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
              Term: <strong style={{ color: '#ffffff', fontWeight: 800 }}>{semester || '3rd Sem'} ({section || 'Section A'})</strong> | A.Y. {academicYear || '2026-2027'}
            </div>
            <button
              className="no-print"
              onClick={handlePrintTranscript}
              style={{
                marginTop: 4, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none',
                padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              🖨️ Print Official Transcript
            </button>
          </div>
        </div>
      </div>

      {/* 2. Structured Academic Identity Credentials Grid */}
      <div className="content-card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Registration & Academic Credentials
          </h3>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Official Institution Database Record</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #2563eb', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎓</span> Academic Program
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{program}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #0284c7', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏢</span> Department
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{departmentName}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #7c3aed', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🆔</span> USN / Registration Number
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#2563eb', marginTop: 6, fontFamily: 'monospace' }}>{activeUsn}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #059669', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📚</span> Current Semester & Section
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{semester} — {section}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #d97706', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✉️</span> Registered Email
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeEmail}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 14, borderLeft: '4px solid #475569', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏛️</span> Institution / Campus
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>DSATM Main Campus, Bengaluru</div>
          </div>
        </div>
      </div>

      {/* 3. Structured Academic Summary KPIs */}
      <div className="content-card" style={{ padding: 26 }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          📊 Academic Progress & Standing Summary
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: '#eff6ff', padding: 20, borderRadius: 16, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>📚 Enrolled Subjects</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginTop: 6 }}>{summary?.enrolledSubjectsCount ?? 0}</div>
            <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>Active Semester Courses</div>
          </div>

          <div style={{ background: summary?.attendanceEligible !== false ? '#f0fdf4' : '#fef2f2', padding: 20, borderRadius: 16, border: summary?.attendanceEligible !== false ? '1px solid #bbf7d0' : '1px solid #fca5a5' }}>
            <div style={{ fontSize: 11, color: summary?.attendanceEligible !== false ? '#166534' : '#991b1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>📅 Overall Attendance</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: summary?.overallAttendance === 'Not Marked' ? '#64748b' : summary?.attendanceEligible !== false ? '#16a34a' : '#dc2626', marginTop: 6 }}>
              {summary?.overallAttendance || 'Not Marked'}
            </div>
            <div style={{ fontSize: 12, color: summary?.attendanceEligible !== false ? '#15803d' : '#b91c1c', fontWeight: 600, marginTop: 4 }}>
              {summary?.attendanceEligible !== false ? '✓ Exam Eligible (≥75%)' : '⚠️ Shortage Alert (<75%)'}
            </div>
          </div>

          <div style={{ background: '#faf5ff', padding: 20, borderRadius: 16, border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Internal Evaluations</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: summary?.internalEvaluationsCount > 0 ? '#7c3aed' : '#64748b', marginTop: 6 }}>
              {summary?.internalEvaluationsCount ?? 0} Published
            </div>
            <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>50-Mark Continuous Assessment</div>
          </div>

          <div style={{ background: '#fff7ed', padding: 20, borderRadius: 16, border: '1px solid #ffedd5' }}>
            <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>🛡️ Active Backlogs</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: summary?.backlogsCount > 0 ? '#ea580c' : '#16a34a', marginTop: 6 }}>
              {summary?.backlogsCount || 0}
            </div>
            <div style={{ fontSize: 12, color: summary?.backlogsCount > 0 ? '#c2410c' : '#15803d', fontWeight: 600, marginTop: 4 }}>
              {summary?.backlogsCount > 0 ? 'Backlog Exams Pending' : '✓ Clean Academic Standing'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Structured Subject Academic Summary Table */}
      <div className="content-card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            📖 Subject-wise Academic Status Breakdown
          </h3>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Updated in real-time by faculty & examination dept</span>
        </div>

        {!subjectSummary || subjectSummary.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            No registered subject records available yet.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="results-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>SUBJECT</th>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>FACULTY INSTRUCTOR</th>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>ATTENDANCE %</th>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>INTERNAL SCORE (50M)</th>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>MAIN EXAM RESULT</th>
                  <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>ACADEMIC STATUS</th>
                </tr>
              </thead>
              <tbody>
                {subjectSummary.map((sub, idx) => (
                  <tr key={sub.subjectId} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{sub.subjectName}</div>
                      <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 800, border: '1px solid #bfdbfe', fontFamily: 'monospace' }}>
                        {sub.subjectCode}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>
                      {sub.facultyName || 'Faculty Assigned'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {sub.attendancePercentage === 'Not Marked' ? (
                        <span style={{ padding: '4px 10px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 700, border: '1px solid #cbd5e1' }}>
                          Not Marked
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                          background: sub.attendancePercentage?.includes('<') || sub.attendancePercentage === '0%' ? '#fee2e2' : '#dcfce7',
                          color: sub.attendancePercentage?.includes('<') || sub.attendancePercentage === '0%' ? '#b91c1c' : '#15803d',
                          border: sub.attendancePercentage?.includes('<') || sub.attendancePercentage === '0%' ? '1px solid #fca5a5' : '1px solid #86efac'
                        }}>
                          {sub.attendancePercentage}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {sub.internalMarks === 'Not Published' ? (
                        <span style={{ padding: '4px 10px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 700, border: '1px solid #cbd5e1' }}>
                          Not Published
                        </span>
                      ) : (
                        <span style={{ padding: '4px 12px', borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 900, border: '1px solid #93c5fd' }}>
                          {sub.internalMarks}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {sub.mainExamStatus === 'Not Published' ? (
                        <span style={{ padding: '4px 10px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 700, border: '1px solid #cbd5e1' }}>
                          Not Published
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                          background: sub.mainExamStatus?.includes('PASSED') ? '#dcfce7' : '#fee2e2',
                          color: sub.mainExamStatus?.includes('PASSED') ? '#15803d' : '#b91c1c',
                          border: sub.mainExamStatus?.includes('PASSED') ? '1px solid #86efac' : '1px solid #fca5a5'
                        }}>
                          {sub.mainExamStatus}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'inline-block',
                        background: sub.academicStatus?.includes('REGULAR') ? '#dcfce7' : '#fee2e2',
                        color: sub.academicStatus?.includes('REGULAR') ? '#15803d' : '#b91c1c',
                        border: sub.academicStatus?.includes('REGULAR') ? '1px solid #86efac' : '1px solid #fca5a5'
                      }}>
                        {sub.academicStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Signatures & Seal (Only visible during print) */}
      <div className="print-only-footer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1.5px solid #0f172a' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Date of Issue: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginTop: 22 }}>Signature of Verifying Officer</div>
            <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>Academic & Exam Records Section</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <DocumentQrBadge
              documentId={`profile-transcript-${activeUsn}`}
              documentType="MARKS_CARD"
              documentTitle={`Official Academic Transcript - ${studentName}`}
              studentName={studentName}
              usn={activeUsn}
              departmentName={departmentName}
              academicYear={academicYear}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginTop: 34 }}>Controller of Examinations / Principal</div>
            <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>DSATM Bengaluru</div>
          </div>
        </div>
      </div>
    </div>
  )
}

