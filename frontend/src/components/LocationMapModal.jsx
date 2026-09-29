import React from 'react'
import './LocationMapModal.css'

export default function LocationMapModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const googleMapsSearchUrl =
    'https://www.google.com/maps/search/?api=1&query=Dayananda+Sagar+Academy+of+Technology+and+Management+Kanakapura+Road+Bengaluru'
  const embedUrl =
    'https://maps.google.com/maps?q=Dayananda+Sagar+Academy+of+Technology+and+Management+Kanakapura+Road+Bengaluru&t=&z=15&ie=UTF8&iwloc=&output=embed'

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="location-modal-header">
          <div className="location-header-title">
            <span className="location-icon-pin">📍</span>
            <div>
              <h3>DSATM Live Campus Location & Navigation</h3>
              <p>Dayananda Sagar Academy of Technology & Management • Bengaluru</p>
            </div>
          </div>
          <button className="location-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Modal Body */}
        <div className="location-modal-body">
          {/* Live Google Map Iframe Embed */}
          <div className="map-iframe-container">
            <iframe
              title="DSATM Campus Live Google Map"
              src={embedUrl}
              width="100%"
              height="360"
              style={{ border: 0, borderRadius: 14 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Location Info & How to Reach Cards */}
          <div className="location-info-grid">
            <div className="loc-info-card">
              <h4>🏢 Exact Campus Address</h4>
              <p>
                Dayananda Sagar Academy of Technology and Management (DSATM)<br />
                Opposite Art of Living International Centre, Kanakapura Main Road,<br />
                Udayapura, Bengaluru, Karnataka 560082
              </p>
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-open-gmaps"
              >
                🗺️ Open in Google Maps App for Turn-by-Turn GPS →
              </a>
            </div>

            <div className="loc-info-card">
              <h4>🚍 How to Reach DSATM Campus</h4>
              <ul className="transit-list">
                <li>
                  <strong>🚇 Namma Metro:</strong> Green Line terminal at <em>Silk Institute Metro Station</em> (3 km away). Frequent feeder autos & buses available.
                </li>
                <li>
                  <strong>🚌 BMTC Bus Services:</strong> Bus route numbers <code>211</code>, <code>211-A</code>, <code>216</code>, <code>211-N</code> stop directly at <em>Udayapura / DSATM Gate</em>.
                </li>
                <li>
                  <strong>🚗 By Road:</strong> Straight drive down Kanakapura Main Road (NH 948) from JP Nagar, Banashankari, or Silk Board.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
