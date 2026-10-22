import React, { useState } from 'react'
import './PgsModal.css'

const PG_LIST = [
  {
    id: 'pg-1',
    name: 'Sri Sai Comforts Boys & Girls PG',
    category: 'unisex',
    genderTag: 'Boys & Girls (Separate Wings)',
    genderPill: '👥 Boys & Girls',
    distance: '300m from DSATM Main Gate',
    walk: '5 min walk',
    rent: '₹6,500 - ₹9,500 / mo',
    food: '3-Time Veg & Non-Veg Meals included',
    sharing: '1, 2 & 3 Sharing Available',
    amenities: ['3-Time Food', '200Mbps Wi-Fi', 'Hot Water 24/7', 'Daily Housekeeping', 'CCTV & Security', 'Washing Machine'],
    address: 'Kanakapura Main Road, Opp. Art of Living, Kaggalipura',
    phone: '+91 98451 22344',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Sri+Sai+Comforts+PG+Opp+Art+of+Living+Kaggalipura+Bengaluru',
    badge: 'Popular Choice',
    badgeType: 'popular'
  },
  {
    id: 'pg-2',
    name: 'Sri Venkateshwara Luxury Student PG',
    category: 'boys',
    genderTag: 'Boys PG Only',
    genderPill: '👨 Boys Only',
    distance: '500m from DSATM Gate',
    walk: '7 min walk',
    rent: '₹7,000 - ₹11,000 / mo',
    food: 'Unlimited 3 Meals + Sunday Special Non-Veg',
    sharing: 'Single & Twin Sharing (AC / Non-AC)',
    amenities: ['AC Rooms', 'High Speed Wi-Fi', '24/7 Power Backup', 'Gaming Zone', 'Washing Machine', 'Fingerprint Biometric'],
    address: 'Near Art of Living Gate 2, Kanakapura Road',
    phone: '+91 99805 77890',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Sri+Venkateshwara+Luxury+PG+Near+Art+of+Living+Gate+2+Kanakapura+Road+Bengaluru',
    badge: 'Luxury AC Rooms',
    badgeType: 'luxury'
  },
  {
    id: 'pg-3',
    name: 'Royal Orchid Girls PG & Hostel',
    category: 'girls',
    genderTag: 'Girls PG Only (High Security)',
    genderPill: '👩 Girls Only',
    distance: '400m from DSATM Gate',
    walk: '6 min walk',
    rent: '₹7,500 - ₹10,500 / mo',
    food: '3-Time Home Style Food + Evening Snacks',
    sharing: '2, 3 & 4 Sharing Rooms',
    amenities: ['24/7 Female Warden', 'CCTV Security', 'Fingerprint Biometric', 'Self-Cooking Kitchen', 'Quiet Study Room', 'Daily Maid Service'],
    address: 'Udayapura Colony, Kanakapura Main Road',
    phone: '+91 97412 33455',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Royal+Orchid+Girls+Hostel+Udayapura+Colony+Kanakapura+Road+Bengaluru',
    badge: 'Strict Security',
    badgeType: 'security'
  },
  {
    id: 'pg-4',
    name: 'Green View Executive PG',
    category: 'unisex',
    genderTag: 'Separate Boys & Girls Buildings',
    genderPill: '👥 Boys & Girls',
    distance: '800m from DSATM Gate',
    walk: '10 min walk',
    rent: '₹5,500 - ₹8,500 / mo',
    food: 'Food Optional / Mess Facility Available',
    sharing: '2 & 3 Sharing Rooms',
    amenities: ['Attached Bathrooms', 'RO Drinking Water', 'Two Wheeler Parking', '100Mbps Wi-Fi', 'Self-Cooking Option', 'Power Backup'],
    address: 'Kaggalipura Main Road, near Silk Institute Metro',
    phone: '+91 91102 66788',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Green+View+Executive+PG+Kaggalipura+near+Silk+Institute+Metro+Bengaluru',
    badge: 'Budget Friendly',
    badgeType: 'budget'
  },
  {
    id: 'pg-5',
    name: 'DSATM On-Campus Hostels',
    category: 'campus',
    genderTag: 'Official Campus Hostel (Boys & Girls)',
    genderPill: '🏛️ Campus Hostel',
    distance: '0m (Inside DSATM Campus)',
    walk: 'On-Campus',
    rent: 'As per DSATM Annual Fee Schedule',
    food: 'Central Campus Dining Hall Mess',
    sharing: 'Twin & Triple Sharing Rooms',
    amenities: ['Campus Wi-Fi', '24/7 Medical Care', 'Sports Complex & Gym', 'Library Access', 'Night Warden Security', 'Full Power Backup'],
    address: 'DSATM Campus, Udayapura, Bengaluru',
    phone: '+91 80 2843 2999',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Dayananda+Sagar+Academy+of+Technology+and+Management+DSATM+Bangalore',
    badge: 'Official Campus Hostel',
    badgeType: 'campus'
  }
]

export default function PgsModal({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all')

  if (!isOpen) return null

  const filteredPgs = PG_LIST.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'boys') return p.category === 'boys' || p.category === 'unisex' || p.category === 'campus'
    if (filter === 'girls') return p.category === 'girls' || p.category === 'unisex' || p.category === 'campus'
    if (filter === 'campus') return p.category === 'campus'
    return true
  })

  return (
    <div className="pgs-modal-overlay" onClick={onClose}>
      <div className="pgs-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pgs-modal-header">
          <div>
            <div className="pgs-header-tag">STUDENT ACCOMMODATION DIRECTORY</div>
            <h3 className="pgs-header-title">🏡 Nearby PGs & Hostels (DSATM Campus)</h3>
            <p className="pgs-header-sub">
              Verified paying guest accommodations, private hostels & campus housing with structured rent & contact numbers
            </p>
          </div>
          <button className="pgs-close-btn" onClick={onClose} aria-label="Close accommodation directory">✕</button>
        </div>

        {/* Filter Tabs */}
        <div className="pgs-filter-bar">
          <button
            type="button"
            className={`pgs-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Hostels & PGs ({PG_LIST.length})
          </button>
          <button
            type="button"
            className={`pgs-filter-btn ${filter === 'boys' ? 'active' : ''}`}
            onClick={() => setFilter('boys')}
          >
            👨 Boys PGs & Hostels (4)
          </button>
          <button
            type="button"
            className={`pgs-filter-btn ${filter === 'girls' ? 'active' : ''}`}
            onClick={() => setFilter('girls')}
          >
            👩 Girls PGs & Hostels (4)
          </button>
          <button
            type="button"
            className={`pgs-filter-btn ${filter === 'campus' ? 'active' : ''}`}
            onClick={() => setFilter('campus')}
          >
            🏛️ Campus Hostel (1)
          </button>
        </div>

        {/* Modal Body Scroll */}
        <div className="pgs-modal-body">
          <div className="pgs-grid">
            {filteredPgs.map((pg) => (
              <div key={pg.id} className="pg-card">
                {/* 1. Header with Badges & Proximity */}
                <div className="pg-card-header">
                  <div className="pg-badge-row">
                    <span className={`pg-badge pg-badge-${pg.badgeType}`}>{pg.badge}</span>
                    <span className="pg-gender-pill">{pg.genderPill}</span>
                  </div>
                  <h4 className="pg-name">{pg.name}</h4>
                  <div className="pg-distance-bar">
                    <span className="pg-dist-icon">📍</span>
                    <span className="pg-dist-text">{pg.distance}</span>
                    <span className="pg-dist-dot">•</span>
                    <span className="pg-walk-tag">🚶 {pg.walk}</span>
                  </div>
                </div>

                {/* 2. Structured 2x2 Specs Grid */}
                <div className="pg-specs-grid">
                  <div className="pg-spec-card highlight-rent">
                    <div className="pg-spec-header">
                      <span className="pg-spec-icon">💳</span>
                      <span className="pg-spec-label">ESTIMATED RENT</span>
                    </div>
                    <div className="pg-spec-value rent-val">{pg.rent}</div>
                  </div>

                  <div className="pg-spec-card">
                    <div className="pg-spec-header">
                      <span className="pg-spec-icon">🛏️</span>
                      <span className="pg-spec-label">ROOM SHARING</span>
                    </div>
                    <div className="pg-spec-value">{pg.sharing}</div>
                  </div>

                  <div className="pg-spec-card">
                    <div className="pg-spec-header">
                      <span className="pg-spec-icon">🍱</span>
                      <span className="pg-spec-label">FOOD & DINING</span>
                    </div>
                    <div className="pg-spec-value">{pg.food}</div>
                  </div>

                  <div className="pg-spec-card">
                    <div className="pg-spec-header">
                      <span className="pg-spec-icon">👥</span>
                      <span className="pg-spec-label">WING DETAILS</span>
                    </div>
                    <div className="pg-spec-value">{pg.genderTag}</div>
                  </div>
                </div>

                {/* 3. Included Amenities */}
                <div className="pg-amenities-wrap">
                  <span className="amenities-lbl">✓ INCLUDED AMENITIES</span>
                  <div className="amenity-chips">
                    {pg.amenities.map((a, i) => (
                      <span key={i} className="amenity-chip">✓ {a}</span>
                    ))}
                  </div>
                </div>

                {/* 4. Structured Address & Action Footer */}
                <div className="pg-card-footer">
                  <div className="pg-address-row">
                    <span className="pg-address-icon">🏢</span>
                    <span className="pg-address">{pg.address}</span>
                  </div>
                  <div className="pg-action-buttons">
                    <a
                      href={`tel:${pg.phone.replace(/[\s-]/g, '')}`}
                      className="pg-call-btn"
                    >
                      <span>📞</span>
                      <span>Call Owner ({pg.phone})</span>
                    </a>
                    <a
                      href={pg.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.name + ' ' + pg.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pg-location-btn"
                      title="Open Location in Google Maps"
                    >
                      <span>📍</span>
                      <span>Location</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
