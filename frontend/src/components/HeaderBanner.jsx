import React from 'react'
import './HeaderBanner.css'

export default function HeaderBanner({
  collegeName = 'DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT',
  subtitle = 'AI Examination Management System',
  tagline = 'Learn | Assess | Analyze | Excel',
}) {
  return (
    <header className="main-header-banner">
      <div className="header-left">
        <div className="logo-container">
          <img src="/dsi-logo.png" alt="DSI Logo" className="header-dsi-logo" />
        </div>
        <div className="header-left-badge">
          <span className="institution-tag">DSI • ESTD 1960</span>
        </div>
      </div>

      <div className="header-center">
        <h1 className="header-college-title-center">{collegeName}</h1>
        <p className="header-system-subtitle-center">{subtitle}</p>
      </div>

      <div className="header-right">
        <span className="tagline-pill">{tagline}</span>
      </div>
    </header>
  )
}
