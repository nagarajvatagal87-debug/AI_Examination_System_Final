import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client.js'
import './Analytics.css'

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const examId = searchParams.get('examId')

  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(examId || '')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/faculty/dashboard-summary')
      .then((res) => {
        const list = res.data?.recentExams || []
        setExams(list)
        if (!examId && list.length > 0) {
          setSelectedExamId(list[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const activeId = examId || selectedExamId
    if (!activeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    api.get(`/faculty/exams/${activeId}/analytics`)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [examId, selectedExamId])

  const activeId = examId || selectedExamId

  const evaluatedCount = stats?.evaluatedCount || 0
  const average = stats?.average ?? 0
  const highest = stats?.highest ?? 0
  const lowest = stats?.lowest ?? 0

  const hasAnalyticsData = Boolean(stats && evaluatedCount > 0)
  const defaultDist = stats?.distribution || {}
  const distData = Object.entries(defaultDist).map(([range, count]) => ({ range, count }))
  
  const passCount = (defaultDist['41-60%'] || 0) + (defaultDist['61-80%'] || 0) + (defaultDist['81-100%'] || 0)
  const failCount = Math.max(0, evaluatedCount - passCount)
  const passPercent = evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="an-title">📊 Subject & Examination Analytics</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Class Performance Metrics & Score Distributions</p>
        </div>

        {exams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Select Exam:</label>
            <select
              value={activeId}
              onChange={(e) => {
                setSelectedExamId(e.target.value)
                setSearchParams({ examId: e.target.value })
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.subjectName} — {ex.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!hasAnalyticsData ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'rgba(30,41,59,0.4)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>No Analytics Data Available Yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Analytics will generate automatically once student answer sheets are uploaded and evaluated for this subject.
          </p>
        </div>
      ) : (
        <>
          <div className="an-cards">
            <div className="an-card an-card-blue">
              <div className="an-card-header">
                <span className="an-card-icon">📊</span>
                <span className="an-card-chip blue">Average</span>
              </div>
              <div className="an-card-value">{average}</div>
              <div className="an-card-label">Class Average Mark</div>
            </div>

            <div className="an-card an-card-green">
              <div className="an-card-header">
                <span className="an-card-icon">🏆</span>
                <span className="an-card-chip green">Highest</span>
              </div>
              <div className="an-card-value">{highest}</div>
              <div className="an-card-label">Highest Score</div>
            </div>

            <div className="an-card an-card-amber">
              <div className="an-card-header">
                <span className="an-card-icon">📉</span>
                <span className="an-card-chip amber">Lowest</span>
              </div>
              <div className="an-card-value">{lowest}</div>
              <div className="an-card-label">Lowest Score</div>
            </div>

            <div className="an-card an-card-purple">
              <div className="an-card-header">
                <span className="an-card-icon">🎓</span>
                <span className="an-card-chip purple">Eligibility</span>
              </div>
              <div className="an-card-value">{passPercent}%</div>
              <div className="an-card-label">Eligibility Pass Rate (≥25M)</div>
            </div>
          </div>

          <div className="an-section">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#0f172a', fontWeight: 800 }}>
              📈 Student Score Distribution Bracket
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="range" stroke="#64748b" />
                <YAxis allowDecimals={false} stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, color: '#0f172a', boxShadow: '0 4px 12px rgba(15,23,42,0.1)' }} />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="an-section">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#0f172a', fontWeight: 800 }}>
              🎯 Pass vs Detained Student Proportion
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={[{ name: 'Students', Eligible: passCount, Detained: failCount }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" allowDecimals={false} stroke="#64748b" />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, color: '#0f172a', boxShadow: '0 4px 12px rgba(15,23,42,0.1)' }} />
                <Bar dataKey="Eligible" fill="#10b981" stackId="a" />
                <Bar dataKey="Detained" fill="#f87171" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}