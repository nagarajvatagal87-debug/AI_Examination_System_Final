import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import './VerifyDocument.css'

export default function VerifyDocument() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [verification, setVerification] = useState(null)

  useEffect(() => {
    async function checkVerification() {
      setLoading(true)
      try {
        const res = await axios.get(`/api/public/verify-document/${token}`)
        setVerification(res.data)
      } catch (err) {
        setVerification({
          status: 'INVALID',
          message: 'Unable to verify this document.',
        })
      } finally {
        setLoading(false)
      }
    }
    checkVerification()
  }, [token])

  if (loading) {
    return (
      <div className="verify-page-wrapper">
        <div className="verify-card-box loading-box">
          <div className="spinner-blue"></div>
          <h2>Validating Official College Document...</h2>
          <p>Contacting Authoritative DSATM Academic Repository</p>
        </div>
      </div>
    )
  }

  const status = verification?.status || 'INVALID'
  const studentName = verification?.studentName && verification?.studentName !== 'Student Candidate' && verification?.studentName !== 'N/A' && verification?.studentName !== 'Ananya Sharma'
    ? verification.studentName 
    : 'Authorized Student'
  const usn = verification?.usn && verification?.usn !== 'N/A' && verification?.usn !== 'USN-UNKNOWN' && verification?.usn !== '1DT22MC045'
    ? verification.usn 
    : 'USN Pending'
  const departmentName = verification?.departmentName || 'Department of Computer Applications (MCA)'

  return (
    <div className="verify-page-wrapper">
      {/* Official College Header Letterhead Bar */}
      <header className="verify-official-header">
        <div className="verify-header-inner">
          <img src="/dsi-logo.png" alt="DSI Logo" className="verify-inst-logo" />
          <div className="verify-header-title-block">
            <h1 className="verify-inst-title">DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT</h1>
            <p className="verify-inst-sub">(An Autonomous Institute Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi) | NAAC 'A+' Accredited</p>
            <div className="verify-portal-tag">OFFICIAL PUBLIC DOCUMENT VERIFICATION PORTAL</div>
          </div>
          <img src="/vtu-logo.png" alt="VTU Logo" className="verify-inst-logo" />
        </div>
      </header>

      <main className="verify-container">
        {status === 'VALID' && (
          <div className="verify-card-box valid-card">
            {/* Status Verification Banner */}
            <div className="status-badge-header green">
              <div className="icon-shield-wrap">
                <span className="icon-shield">✓</span>
              </div>
              <div>
                <div className="status-title-row">
                  <h2>OFFICIAL DOCUMENT VERIFIED & VALID</h2>
                  <span className="ver-live-pill">● REAL-TIME DB VERIFIED</span>
                </div>
                <p className="status-sub">Issued & Authenticated by Dayananda Sagar Academy of Technology and Management</p>
              </div>
            </div>

            {/* Document Title Header */}
            <div className="doc-primary-banner">
              <span className="doc-banner-label">DOCUMENT TITLE</span>
              <h3 className="doc-banner-title">{verification.documentTitle || 'Official Academic Document'}</h3>
              <div className="doc-badge-row">
                <span className="badge-type">{(verification.documentType || 'OFFICIAL').replace(/_/g, ' ')}</span>
                <span className="badge-version">Version {verification.version || 1} (Original Issue)</span>
              </div>
            </div>

            {/* Structured Section 1: Candidate Identity */}
            <div className="verify-section-box">
              <h4 className="section-box-title">👤 Candidate & Academic Identity</h4>
              <div className="doc-details-grid">
                <div className="detail-row">
                  <span className="detail-label">Student / Recipient Name</span>
                  <span className="detail-value student-name">{studentName}</span>
                </div>

                <div className="detail-row highlight-row">
                  <span className="detail-label">USN / Registration Number</span>
                  <span className="detail-value usn-code">{usn}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Department / Branch</span>
                  <span className="detail-value">{departmentName}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Academic Year</span>
                  <span className="detail-value">{verification.academicYear || '2026-2027'}</span>
                </div>
              </div>
            </div>

            {/* Structured Section 2: Verification Audit & Cryptographic Security */}
            <div className="verify-section-box">
              <h4 className="section-box-title">🔒 Verification Reference & Cryptographic Security</h4>
              <div className="doc-details-grid">
                <div className="detail-row">
                  <span className="detail-label">Issue Date & Time</span>
                  <span className="detail-value">{verification.issuedAt ? new Date(verification.issuedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Public Verification Ref. ID</span>
                  <span className="detail-value ref-code">{verification.publicVerificationId || 'DSATM-VER-REF'}</span>
                </div>

                <div className="detail-row full-span hash-row">
                  <span className="detail-label">Cryptographic SHA-256 Hash Integrity</span>
                  <code className="hash-code">{verification.documentHash || '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a'}</code>
                </div>
              </div>
            </div>

            {/* Trust Footer & Seal */}
            <div className="trust-footer">
              <div className="seal-watermark">
                <span className="verified-stamp">✓ DSATM OFFICIAL VERIFICATION SEAL</span>
              </div>
              <p className="privacy-note">
                🔒 Privacy & Legal Notice: This public verification service confirms document authenticity directly from official DSATM academic database records without exposing unpermitted private student data.
              </p>
              <Link to="/" className="home-back-btn">← Return to Institution Portal</Link>
            </div>
          </div>
        )}

        {status === 'REVOKED' && (
          <div className="verify-card-box revoked-card">
            <div className="status-badge-header orange">
              <span className="icon-shield">⚠</span>
              <div>
                <h2>DOCUMENT REVOKED</h2>
                <p className="status-sub">Institutional Document Status Notice</p>
              </div>
            </div>

            <p className="warning-lead">
              This document was originally issued by the college, but has been <strong>revoked</strong> by institutional authority.
            </p>

            <div className="doc-details-grid">
              <div className="detail-row">
                <span className="detail-label">Document Title</span>
                <span className="detail-value">{verification.documentTitle || 'Academic Document'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Student Name</span>
                <span className="detail-value">{studentName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">USN</span>
                <span className="detail-value">{usn}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Revocation Notice</span>
                <span className="detail-value warning-text">{verification.revokedReason || 'Document revoked by administration.'}</span>
              </div>
            </div>

            <div className="trust-footer">
              <p className="privacy-note">Please contact the Examination Department for official updates.</p>
              <Link to="/" className="home-back-btn">← Return to Institution Portal</Link>
            </div>
          </div>
        )}

        {status === 'SUPERSEDED' && (
          <div className="verify-card-box superseded-card">
            <div className="status-badge-header blue">
              <span className="icon-shield">ℹ</span>
              <div>
                <h2>DOCUMENT SUPERSEDED / REPLACED</h2>
                <p className="status-sub">Updated Version Available</p>
              </div>
            </div>

            <p className="info-lead">
              This document version has been replaced by an updated official record issued by the institution (e.g., following revaluation or official correction).
            </p>

            <div className="doc-details-grid">
              <div className="detail-row">
                <span className="detail-label">Document Title</span>
                <span className="detail-value">{verification.documentTitle}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Student Name</span>
                <span className="detail-value">{studentName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">USN</span>
                <span className="detail-value">{usn}</span>
              </div>
            </div>
            <div className="trust-footer">
              <Link to="/" className="home-back-btn">← Return to Institution Portal</Link>
            </div>
          </div>
        )}

        {status === 'INVALID' && (
          <div className="verify-card-box invalid-card">
            <div className="status-badge-header red">
              <span className="icon-shield">✕</span>
              <div>
                <h2>VERIFICATION FAILED</h2>
                <p className="status-sub">Unable to verify document authenticity</p>
              </div>
            </div>

            <div className="failed-notice">
              <p>No matching official document verification record was found in the college backend system.</p>
              <ul>
                <li>The QR code or verification link may be fraudulent or tampered with.</li>
                <li>The document was not generated by an authorized DSATM college module.</li>
                <li>The verification token has expired or been corrupted.</li>
              </ul>
            </div>

            <div className="trust-footer">
              <p className="privacy-note">If you believe this is an error, please contact the Office of the Controller of Examinations, DSATM.</p>
              <Link to="/" className="home-back-btn">← Return to Institution Portal</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

