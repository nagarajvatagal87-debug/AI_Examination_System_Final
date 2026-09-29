import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import LocationMapModal from './LocationMapModal.jsx'
import PgsModal from './PgsModal.jsx'
import './Footer.css'

export default function Footer() {
  const [showMap, setShowMap] = useState(false)
  const [showPgs, setShowPgs] = useState(false)

  return (
    <>
      <footer className="main-footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Column 1: Brand & Institution Overview */}
            <div className="footer-col footer-col-brand">
              <div className="footer-logo-row">
                <div className="footer-logo-box">
                  <img src="/dsi-logo.png" alt="DSI Logo" className="footer-dsi-logo" />
                </div>
                <div>
                  <h3 className="footer-brand-title">DAYANANDA SAGAR</h3>
                  <p className="footer-brand-sub">Academy of Technology & Management</p>
                </div>
              </div>
              <p className="footer-desc">
                Premier Autonomous Institution affiliated with VTU, Belagavi and approved by AICTE, New Delhi. Grounded in AI-powered examination, RAG question generation, and transparent academic governance.
              </p>
              <div className="footer-badges">
                <span className="vtu-badge">🏛️ VTU Affiliated</span>
                <span className="aicte-badge">✓ AICTE Approved</span>
                <span className="naac-badge">★ NAAC A+ Grade</span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="footer-col">
              <h4 className="footer-col-title">Portal Access</h4>
              <ul className="footer-links">
                <li><Link to="/login?role=student">🎓 Student Portal</Link></li>
                <li><Link to="/login?role=faculty">👨‍🏫 Faculty Portal</Link></li>
                <li><Link to="/login?role=hod">🏛️ HOD Portal</Link></li>
                <li><Link to="/login?role=principal">👑 Principal Portal</Link></li>
                <li><Link to="/login?role=examdept">⚖️ Exam Dept Portal</Link></li>
              </ul>
            </div>

            {/* Column 3: Public Disclosure & Accommodations */}
            <div className="footer-col">
              <h4 className="footer-col-title">Public & Campus Info</h4>
              <ul className="footer-links">
                <li><Link to="/college-info">📖 Official Public Information</Link></li>
                <li><button type="button" className="footer-link-btn" onClick={() => setShowMap(true)}>📍 Live Campus Location & Map</button></li>
                <li><button type="button" className="footer-link-btn" onClick={() => setShowPgs(true)}>🏡 Nearby Student PGs & Hostels</button></li>
                <li><a href="https://vtu.ac.in" target="_blank" rel="noreferrer">🔗 VTU Official Portal</a></li>
              </ul>
            </div>

            {/* Column 4: Contact & Location */}
            <div className="footer-col">
              <h4 className="footer-col-title">Campus Location</h4>
              <p className="footer-contact-item">
                📍 Opp. Art of Living, Kanakapura Main Road, Udayapura, Bengaluru, Karnataka 560082
              </p>
              <p className="footer-contact-item">
                📞 Emergency Academic Helpline: +91 80 2843 2999
              </p>
              <p className="footer-contact-item">
                ✉️ Official Admissions: principal@dsatm.edu.in
              </p>
              <button
                type="button"
                className="footer-map-btn"
                onClick={() => setShowMap(true)}
              >
                🗺️ Open Live Interactive Map →
              </button>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Dayananda Sagar Academy of Technology and Management (DSATM). All Rights Reserved.</p>
            <div className="footer-bottom-links">
              <span>Integrated AI Academic System</span>
              <span>•</span>
              <span>RAG Question & Evaluation Engine</span>
            </div>
          </div>
        </div>
      </footer>

      <LocationMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
      <PgsModal isOpen={showPgs} onClose={() => setShowPgs(false)} />
    </>
  )
}
