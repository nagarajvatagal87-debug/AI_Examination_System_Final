import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/client.js'
import './HodCommon.css'

export default function HodSubjectPassRates() {
  const [rates, setRates] = useState([])

  useEffect(() => {
    api.get('/hod/subject-pass-rates').then((res) => setRates(res.data)).catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="hc-title">Subject-wise Pass Rates</h2>
      <div className="hc-section">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rates}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subjectName" />
            <YAxis domain={[0, 100]} unit="%" />
            <Tooltip />
            <Bar dataKey="passPercent" fill="#0891b2" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}