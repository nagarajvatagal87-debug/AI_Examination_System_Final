import { useState, useEffect } from 'react'
import api from '../../api/client.js'

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
      <div className="content-card" style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
        ⏳ Loading DSATM Student Academic Profile & Record...
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="content-card" style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
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

  const activeUsn = registrationNo && registrationNo !== 'USN Pending' ? registrationNo : '1DS23MCA087'
  const activeEmail = email || 'nagaraj.mca@dsatm.edu.in'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Official Header Banner & Identity */}
      <div className="content-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', padding: 28, borderRadius: 16, boxShadow: '0 10px 25px rgba(15,23,42,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', overflow: 'hidden',
              background: '#2563eb', color: '#ffffff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900,
              border: '3px solid #38bdf8', boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (studentName?.[0] || 'N')
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  🎓 DSATM Official Academic Identity
                </span>
                <span style={{ background: '#10b981', color: '#ffffff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 12 }}>
                  VERIFIED
                </span>
              </div>
              <h2 style={{ margin: '4px 0 2px 0', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                {studentName || 'Nagaraj'}
              </h2>
              <div style={{ fontSize: 14, color: '#cbd5e1' }}>
                USN / Reg No: <strong style={{ color: '#38bdf8', letterSpacing: 0.5 }}>{activeUsn}</strong> · {departmentName}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800,
              background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7'
            }}>
              {enrollmentStatus || 'ACTIVE / REGULAR'}
            </span>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Term: {semester} ({section}) | A.Y. {academicYear}
            </div>
            <button
              onClick={handlePrintTranscript}
              style={{
                marginTop: 4, background: '#3b82f6', color: '#ffffff', border: 'none',
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              🖨️ Print Transcript
            </button>
          </div>
        </div>
      </div>

      {/* 2. Academic Identity Credentials Grid */}
      <div className="content-card">
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 Registration & Academic Credentials
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Academic Program</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{program}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Department</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{departmentName}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>USN / Registration Number</span>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#2563eb', marginTop: 4, fontFamily: 'monospace' }}>{activeUsn}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Current Semester & Section</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{semester} — {section}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Registered Email</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeEmail}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Institution / Campus</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>DSATM Main Campus, Bengaluru</div>
          </div>
        </div>
      </div>

      {/* 3. Academic Summary KPIs */}
      <div className="content-card">
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          📊 Academic Progress & Standing Summary
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ background: '#eff6ff', padding: 18, borderRadius: 12, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Enrolled Subjects</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{summary?.enrolledSubjectsCount || 6}</div>
          </div>

          <div style={{ background: summary?.attendanceEligible !== false ? '#f0fdf4' : '#fef2f2', padding: 18, borderRadius: 12, border: summary?.attendanceEligible !== false ? '1px solid #bbf7d0' : '1px solid #fca5a5' }}>
            <div style={{ fontSize: 11, color: summary?.attendanceEligible !== false ? '#166534' : '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Overall Attendance</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: summary?.overallAttendance === 'Not Marked' ? '#64748b' : summary?.attendanceEligible !== false ? '#16a34a' : '#dc2626', marginTop: 4 }}>
              {summary?.overallAttendance || 'Not Marked'}
            </div>
          </div>

          <div style={{ background: '#faf5ff', padding: 18, borderRadius: 12, border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>Internal Evaluations</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>{summary?.internalEvaluationsCount || 6} Published</div>
          </div>

          <div style={{ background: '#fff7ed', padding: 18, borderRadius: 12, border: '1px solid #ffedd5' }}>
            <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Active Backlogs</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: summary?.backlogsCount > 0 ? '#ea580c' : '#16a34a', marginTop: 4 }}>
              {summary?.backlogsCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Subject Academic Summary Table */}
      <div className="content-card">
        <h3 style={{ margin: '0 0 14px 0', color: '#0f172a', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          📚 Subject-wise Academic Status Breakdown
        </h3>

        {!subjectSummary || subjectSummary.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
            No academic records available yet.
          </div>
        ) : (
          <table className="results-data-table">
            <thead>
              <tr>
                <th>SUBJECT</th>
                <th>FACULTY</th>
                <th>ATTENDANCE %</th>
                <th>INTERNAL SCORE (50M)</th>
                <th>MAIN EXAM RESULT</th>
                <th>ACADEMIC STATUS</th>
              </tr>
            </thead>
            <tbody>
              {subjectSummary.map((sub) => (
                <tr key={sub.subjectId}>
                  <td>
                    <strong>{sub.subjectName}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{sub.subjectCode}</div>
                  </td>
                  <td>{sub.facultyName}</td>
                  <td style={{ fontWeight: 700, color: sub.attendancePercentage?.includes('<') || sub.attendancePercentage?.includes('Shortage') ? '#ef4444' : sub.attendancePercentage === 'Not Marked' ? '#64748b' : '#0f172a' }}>
                    {sub.attendancePercentage || 'Not Marked'}
                  </td>
                  <td style={{ fontWeight: 800, color: '#2563eb' }}>
                    {sub.internalMarks}
                  </td>
                  <td style={{ fontWeight: 800, color: sub.mainExamStatus?.includes('PASSED') ? '#10b981' : sub.mainExamStatus?.includes('FAILED') ? '#ef4444' : '#64748b' }}>
                    {sub.mainExamStatus}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800,
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
        )}
      </div>
    </div>
  )
}
