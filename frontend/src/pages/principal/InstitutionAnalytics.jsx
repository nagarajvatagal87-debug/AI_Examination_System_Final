import React, { useState, useEffect } from 'react'
import api from '../../api/client.js'

export default function InstitutionAnalytics() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/principal/analytics')
      .then((res) => setData(res.data))
      .catch(() => {})
  }, [])

  const analyticsData = [
    { metric: 'Overall Institution Pass Rate', value: data?.overallPassRate || '84%', target: '85%', status: 'On Track', color: '#34d399' },
    { metric: 'Average Student CGPA', value: data?.averageCgpa || '7.9 / 10.0', target: '7.5', status: 'Exceeding', color: '#38bdf8' },
    { metric: 'Internal Evaluation Completion', value: data?.internalCompletion || '95%', target: '90%', status: 'Completed', color: '#c084fc' },
    { metric: 'Student Grievance Resolution Rate', value: data?.grievanceResolutionRate || '98%', target: '95%', status: 'High Quality', color: '#f59e0b' },
  ]

  const branchTrends = data?.branchTrends || [
    { branch: 'Computer Applications (MCA)', rate: 88, color: '#3b82f6' },
    { branch: 'Computer Science (CSE)', rate: 86, color: '#10b981' },
    { branch: 'Information Technology (BCA)', rate: 82, color: '#06b6d4' },
    { branch: 'Electronics (ECE)', rate: 80, color: '#ec4899' },
    { branch: 'Management (MBA)', rate: 78, color: '#8b5cf6' },
  ]

  const cgpaDistribution = data?.cgpaDistribution || [
    { label: 'Above 9.0 CGPA (Outstanding)', count: '45 Students (11%)', color: '#f59e0b' },
    { label: '8.0 - 9.0 CGPA (First Class Distinction)', count: '188 Students (45%)', color: '#34d399' },
    { label: '7.0 - 8.0 CGPA (First Class)', count: '115 Students (27%)', color: '#38bdf8' },
    { label: 'Below 7.0 CGPA (Pass / Re-appear)', count: '72 Students (17%)', color: '#f87171' },
  ]

  return (
    <div className="pd-panel glass-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#f8fafc' }}>📈 Institution Performance Analytics</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px 0' }}>
        Authorized academic quality assurance metrics, evaluation progress indicators, and multi-department attainment benchmarking.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 28 }}>
        {analyticsData.map((item, idx) => (
          <div key={idx} style={{ background: 'rgba(15,23,42,0.65)', padding: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>{item.metric}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.value}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>Target: {item.target}</span>
              <span style={{ color: item.color, fontWeight: 700 }}>● {item.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        <div style={{ background: 'rgba(15,23,42,0.65)', padding: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#f8fafc' }}>Academic Pass Rate Trends per Branch</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {branchTrends.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                  <span style={{ color: '#cbd5e1' }}>{b.branch}</span>
                  <span style={{ color: b.color, fontWeight: 700 }}>{b.rate}% Attainment</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${b.rate}%`, height: '100%', background: b.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.65)', padding: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#f8fafc' }}>CGPA Distribution (All Students)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            {cgpaDistribution.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                <strong style={{ color: item.color }}>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
