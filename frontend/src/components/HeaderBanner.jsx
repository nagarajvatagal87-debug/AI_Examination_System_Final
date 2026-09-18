import React from 'react'
import './HeaderBanner.css'

export default function HeaderBanner({ collegeName = 'DSATM - DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT', subtitle = 'Learn | Assess | Analyze | Excel' }) {
  return (
    <header className="main-header-banner">
      <div className="header-brand-left">
        <div className="header-logo-icon">🎓</div>
        <div>
          <h1 className="header-college-title">{collegeName}</h1>
          <p className="header-system-title">AI Examination Management System</p>
        </div>
      </div>
      <div className="header-tagline-right">
        <span className="tagline-pill">{subtitle}</span>
      </div>
    </header>
  )
}
