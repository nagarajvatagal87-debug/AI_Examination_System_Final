import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client.js'
import './Analytics.css'

export default function Analytics() {
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examId')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!examId) return
    api.get(`/faculty/exams/${examId}/analytics`).then((res) => setStats(res.data)).catch(() => {})
  }, [examId])

  if (!examId) return <p className="hint">Select an examination from the Examinations page first.</p>
  if (!stats) return <p className="hint">No analytics yet — evaluate and verify some students first.</p>

  const distData = Object.entries(stats.distribution).map(([range, count]) => ({ range, count }))
  const passCount = stats.distribution['41-60%'] + stats.distribution['61-80%'] + stats.distribution['81-100%']
  const failCount = stats.evaluatedCount - passCount
  const passPercent = stats.evaluatedCount ? Math.round((passCount / stats.evaluatedCount) * 100) : 0

  return (
    <div>
      <h2 className="an-title">Analytics</h2>

      <div className="an-cards">
        <div className="an-card"><div className="an-card-value">{stats.average}</div><div className="an-card-label">Class Average</div></div>
        <div className="an-card"><div className="an-card-value">{stats.highest}</div><div className="an-card-label">Highest</div></div>
        <div className="an-card"><div className="an-card-value">{stats.lowest}</div><div className="an-card-label">Lowest</div></div>
        <div className="an-card"><div className="an-card-value">{passPercent}%</div><div className="an-card-label">Pass Rate</div></div>
      </div>

      <div className="an-section">
        <h3>Marks Distribution</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={distData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="an-section">
        <h3>Pass vs Fail</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={[{ name: 'Result', Passed: passCount, Failed: failCount }]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip />
            <Bar dataKey="Passed" fill="#10b981" stackId="a" />
            <Bar dataKey="Failed" fill="#f87171" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}