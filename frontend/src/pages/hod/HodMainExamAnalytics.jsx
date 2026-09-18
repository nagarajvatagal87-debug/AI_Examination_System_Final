import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client.js'
import './HodMainExamAnalytics.css'

export default function HodMainExamAnalytics() {
  const [overview, setOverview] = useState(null)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [top10, setTop10] = useState([])
  const [showTop10, setShowTop10] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadOverview() }, [])

  function loadOverview() {
    api.get('/hod/main-exam-overview').then((res) => setOverview(res.data)).catch(() => {})
  }

  function loadStudents(q = '') {
    api.get(`/hod/students-search${q ? `?search=${q}` : ''}`).then((res) => setStudents(res.data)).catch(() => {})
  }

  function loadTop10() {
    api.get('/hod/top10').then((res) => { setTop10(res.data); setShowTop10(true) }).catch(() => {})
  }

  async function handleTransfer() {
    setMsg('Transferring top 10 to Principal...')
    try {
      const { data } = await api.post('/hod/top10/transfer')
      setMsg(`Transferred ${data.count} students to the Principal.`)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Transfer failed')
    }
  }

  if (!overview) return <p className="hint">Loading...</p>
  if (overview.department_id === null) return <p className="hint">{overview.warning}</p>

  const backlogsBySubject = overview.subjectBreakdown.filter((s) => s.failCount > 0)

  return (
    <div className="hma-wrap">
      <h2 className="hma-title">MCA Department — Main Examination Results</h2>

      <div className="hma-cards">
        <div className="hma-card"><div className="hma-card-value">{overview.students}</div><div className="hma-card-label">Students</div></div>
        <div className="hma-card pass"><div className="hma-card-value">{overview.passed}</div><div className="hma-card-label">Passed</div></div>
        <div className="hma-card fail"><div className="hma-card-value">{overview.failed}</div><div className="hma-card-label">Failed</div></div>
        <div className="hma-card backlog"><div className="hma-card-value">{overview.backlogs}</div><div className="hma-card-label">Backlogs</div></div>
      </div>

      <div className="hma-section">
        <h3>Pass vs Fail</h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={[{ name: 'Result', Passed: overview.passed, Failed: overview.failed }]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip />
            <Bar dataKey="Passed" fill="#10b981" stackId="a" />
            <Bar dataKey="Failed" fill="#f87171" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="hma-section">
        <h3>Subject-wise Performance</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={overview.subjectBreakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subjectName" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Bar dataKey="avgPercent" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="hma-section">
        <h3>Backlog Analysis</h3>
        <p className="hma-sub">Students with Backlogs: {overview.backlogs}</p>
        <table className="hma-table">
          <thead><tr><th>Subject</th><th>Students Failed</th></tr></thead>
          <tbody>
            {backlogsBySubject.map((s) => (
              <tr key={s.subjectId}><td>{s.subjectName}</td><td>{s.failCount} students</td></tr>
            ))}
            {backlogsBySubject.length === 0 && <tr><td colSpan={2} className="hint">No backlogs — clean sweep!</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="hma-section">
        <h3>Overall Department Performance</h3>
        <div className="hma-stat-row">
          <div><strong>{overview.overallAveragePercent}%</strong><span>Average</span></div>
          <div><strong>{overview.passPercent}%</strong><span>Pass Rate</span></div>
          <div><strong>{overview.backlogs}</strong><span>Backlog Students</span></div>
          <div><strong>{overview.highestPercent}%</strong><span>Highest</span></div>
          <div><strong>{overview.lowestPercent}%</strong><span>Lowest</span></div>
        </div>
      </div>

      <div className="hma-section">
        <div className="hma-section-header">
          <h3>Student Performance</h3>
          <input className="hma-search" placeholder="🔍 Search student" value={search}
            onChange={(e) => { setSearch(e.target.value); loadStudents(e.target.value) }}
            onFocus={() => students.length === 0 && loadStudents()} />
        </div>
        <table className="hma-table">
          <thead><tr><th>Register No</th><th>Student</th><th>Semester</th><th>%</th><th>Result</th><th>Backlogs</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.studentId}>
                <td>{s.registrationNo}</td><td>{s.fullName}</td><td>{s.semester}</td>
                <td>{s.percentage}%</td>
                <td><span className={`hma-result ${s.result.toLowerCase()}`}>{s.result}</span></td>
                <td>{s.backlogs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hma-section">
        <div className="hma-section-header">
          <h3>Top 10 Students</h3>
          <button className="fd-btn" onClick={loadTop10}>View Top Performers</button>
        </div>
        {showTop10 && (
          <>
            <table className="hma-table">
              <thead><tr><th>Rank</th><th>Student</th><th>Register No</th><th>%</th></tr></thead>
              <tbody>
                {top10.map((s) => (
                  <tr key={s.studentId}><td>{s.rank}</td><td>{s.fullName}</td><td>{s.registrationNo}</td><td>{s.percentage}%</td></tr>
                ))}
              </tbody>
            </table>
            <button className="fd-btn" style={{ marginTop: 12 }} onClick={handleTransfer}>Transfer Top 10 to Principal</button>
          </>
        )}
      </div>

      {msg && <p className="fd-status">{msg}</p>}
    </div>
  )
}