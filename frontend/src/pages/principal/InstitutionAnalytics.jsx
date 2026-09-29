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
    { metric: 'Overall Institution Pass Rate', value: data?.overallPassRate || '84%', target: '85%', status: 'On Track', color: '#047857', bg: '#ecfdf5', titleColor: '#065f46' },
    { metric: 'Average Student CGPA', value: data?.averageCgpa || '7.9 / 10.0', target: '7.5', status: 'Exceeding', color: '#1d4ed8', bg: '#eff6ff', titleColor: '#1e40af' },
    { metric: 'Internal Evaluation Completion', value: data?.internalCompletion || '95%', target: '90%', status: 'Completed', color: '#6d28d9', bg: '#f5f3ff', titleColor: '#5b21b6' },
    { metric: 'Student Grievance Resolution Rate', value: data?.grievanceResolutionRate || '98%', target: '95%', status: 'High Quality', color: '#b45309', bg: '#fffbeb', titleColor: '#92400e' },
  ]

  const branchTrends = data?.branchTrends || [
    { branch: 'Computer Applications (MCA)', rate: 88, color: '#1d4ed8' },
    { branch: 'Computer Science (CSE)', rate: 86, color: '#047857' },
    { branch: 'Information Technology (BCA)', rate: 82, color: '#0284c7' },
    { branch: 'Electronics (ECE)', rate: 80, color: '#db2777' },
    { branch: 'Management (MBA)', rate: 78, color: '#7c3aed' },
  ]

  const cgpaDistribution = data?.cgpaDistribution || [
    { label: 'Above 9.0 CGPA (Outstanding)', count: '45 Students (11%)', color: '#b45309' },
    { label: '8.0 - 9.0 CGPA (First Class Distinction)', count: '188 Students (45%)', color: '#047857' },
    { label: '7.0 - 8.0 CGPA (First Class)', count: '115 Students (27%)', color: '#1d4ed8' },
    { label: 'Below 7.0 CGPA (Pass / Re-appear)', count: '72 Students (17%)', color: '#dc2626' },
  ]

  return (
    <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>📈 Institution Performance Analytics</h2>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 24px 0', fontWeight: 600 }}>
        Authorized academic quality assurance metrics, evaluation progress indicators, and multi-department attainment benchmarking.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 28 }}>
        {analyticsData.map((item, idx) => (
          <div key={idx} style={{ background: item.bg, padding: 20, borderRadius: 14, border: '1.5px solid #1e293b' }}>
            <div style={{ fontSize: 12, color: item.titleColor, marginBottom: 8, fontWeight: 800 }}>{item.metric}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: item.color, marginBottom: 6 }}>{item.value}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: '#475569' }}>Target: {item.target}</span>
              <span style={{ color: item.color, fontWeight: 800 }}>● {item.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, border: '1.5px solid #1e293b' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>Academic Pass Rate Trends per Branch</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {branchTrends.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, fontWeight: 700 }}>
                  <span style={{ color: '#0f172a' }}>{b.branch}</span>
                  <span style={{ color: b.color, fontWeight: 800 }}>{b.rate}% Attainment</span>
                </div>
                <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 6, border: '1px solid #1e293b', overflow: 'hidden' }}>
                  <div style={{ width: `${b.rate}%`, height: '100%', background: b.color, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, border: '1.5px solid #1e293b' }}>
          <h4 style={{ fontSize: 15, margin: '0 0 16px 0', color: '#0f172a', fontWeight: 800 }}>CGPA Distribution (All Students)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            {cgpaDistribution.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #334155' }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.label}</span>
                <strong style={{ color: item.color, fontWeight: 800 }}>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
