import React, { useState } from 'react'
import './PgsModal.css'

const PG_LIST = [
  {
    id: 'pg-1',
    name: 'Sri Sai Comforts Boys & Girls PG',
    category: 'unisex',
    genderTag: 'Boys & Girls (Separate Wings)',
    distance: '300m from DSATM Main Gate (5 min walk)',
    rent: '₹6,500 - ₹9,500 / month',
    food: '3-Time South & North Indian Hygienic Food included',
    sharing: '1, 2, 3 Sharing Available',
    amenities: ['3-Time Food', '200Mbps Wi-Fi', 'Hot Water 24/7', 'Daily Housekeeping', 'CCTV & Security', 'Washing Machine'],
    address: 'Kanakapura Main Road, Opp. Art of Living, Kaggalipura',
    phone: '+91 98451 22344',
    badge: 'Popular Choice'
  },
  {
    id: 'pg-2',
    name: 'Sri Venkateshwara Luxury Student PG',
    category: 'boys',
    genderTag: 'Boys PG Only',
    distance: '500m from DSATM Gate',
    rent: '₹7,000 - ₹11,000 / month',
    food: 'Unlimited 3-Time Food + Sunday Special Non-Veg/Veg',
    sharing: 'Single & Twin Sharing AC/Non-AC',
    amenities: ['AC Rooms', 'High Speed Wi-Fi', 'Power Backup 24/7', 'Gaming Zone', 'Washing Machine', 'Fingerprint Entry'],
    address: 'Near Art of Living Gate 2, Kanakapura Road',
    phone: '+91 99805 77890',
    badge: 'Luxury AC Rooms'
  },
  {
    id: 'pg-3',
    name: 'Royal Orchid Girls PG & Hostel',
    category: 'girls',
    genderTag: 'Girls PG Only (High Security)',
    distance: '400m from DSATM Gate',
    rent: '₹7,500 - ₹10,500 / month',
    food: '3-Time Home Style Hygienic Food + Evening Tea & Snacks',
    sharing: '2, 3, 4 Sharing',
    amenities: ['24/7 Female Security Guard', 'CCTV Monitoring', 'Fingerprint Biometric', 'Self Cooking Kitchen', 'Study Room', 'Daily Maid Service'],
    address: 'Udayapura Colony, Kanakapura Main Road',
    phone: '+91 97412 33455',
    badge: 'Strict Security'
  },
  {
    id: 'pg-4',
    name: 'Green View Executive PG',
    category: 'unisex',
    genderTag: 'Separate Boys & Girls Buildings',
    distance: '800m from DSATM Gate',
    rent: '₹5,500 - ₹8,500 / month',
    food: 'Food Optional / Mess Available',
    sharing: '2 & 3 Sharing',
    amenities: ['Attached Bathroom', 'RO Drinking Water', 'Two Wheeler Parking', 'Wi-Fi 100Mbps', 'Self-Cooking Option'],
    address: 'Kaggalipura Main Road, near Silk Institute Metro',
    phone: '+91 91102 66788',
    badge: 'Budget Friendly'
  },
  {
    id: 'pg-5',
    name: 'DSATM On-Campus Hostels',
    category: 'campus',
    genderTag: 'Official Campus Hostel (Boys & Girls)',
    distance: '0m (Inside DSATM Campus)',
    rent: 'As per College Academic Year Schedule',
    food: 'Central Campus Dining Hall Mess',
    sharing: 'Twin & Triple Sharing',
    amenities: ['Campus Wi-Fi', '24/7 Medical Care', 'Sports Complex & Gym', 'Library Access', 'Night Warden Security'],
    address: 'DSATM Campus, Udayapura, Bengaluru',
    phone: '+91 80 2843 2999',
    badge: 'Official Campus Hostel'
  }
]

export default function PgsModal({ isOpen, onClose }) {
  const [filter, setFilter] = useState('all')

  if (!isOpen) return null

  const filteredPgs = PG_LIST.filter((p) => filter === 'all' || p.category === filter)

  return (
    <div className="pgs-modal-overlay" onClick={onClose}>
      <div className="pgs-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pgs-modal-header">
          <div>
            <div className="pgs-header-tag">STUDENT ACCOMMODATION DIRECTORY</div>
            <h3 className="pgs-header-title">🏡 Nearby PGs & Hostels (DSATM Campus)</h3>
            <p className="pgs-header-sub">Verified paying guest accommodations, private hostels & campus housing with rent & contact numbers</p>
          </div>
          <button className="pgs-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Filter Tabs */}
        <div className="pgs-filter-bar">
          <button type="button" className={`pgs-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All PGs ({PG_LIST.length})</button>
          <button type="button" className={`pgs-filter-btn ${filter === 'boys' ? 'active' : ''}`} onClick={() => setFilter('boys')}>Boys PGs</button>
          <button type="button" className={`pgs-filter-btn ${filter === 'girls' ? 'active' : ''}`} onClick={() => setFilter('girls')}>Girls PGs</button>
          <button type="button" className={`pgs-filter-btn ${filter === 'campus' ? 'active' : ''}`} onClick={() => setFilter('campus')}>Campus Hostel</button>
        </div>

        {/* Modal Body Scroll */}
        <div className="pgs-modal-body">
          <div className="pgs-grid">
            {filteredPgs.map((pg) => (
              <div key={pg.id} className="pg-card">
                <div className="pg-card-top">
                  <div>
                    <span className="pg-badge">{pg.badge}</span>
                    <h4 className="pg-name">{pg.name}</h4>
                    <div className="pg-gender-tag">👥 {pg.genderTag}</div>
                  </div>
                </div>

                <div className="pg-details-table">
                  <div className="pg-detail-row">
                    <span>📍 Distance:</span>
                    <strong>{pg.distance}</strong>
                  </div>
                  <div className="pg-detail-row">
                    <span>💳 Monthly Rent:</span>
                    <strong className="pg-rent-price">{pg.rent}</strong>
                  </div>
                  <div className="pg-detail-row">
                    <span>🍱 Food Facility:</span>
                    <span>{pg.food}</span>
                  </div>
                  <div className="pg-detail-row">
                    <span>🛏️ Sharing Types:</span>
                    <span>{pg.sharing}</span>
                  </div>
                </div>

                <div className="pg-amenities-wrap">
                  <span className="amenities-lbl">Included Amenities:</span>
                  <div className="amenity-chips">
                    {pg.amenities.map((a, i) => (
                      <span key={i} className="amenity-chip">✓ {a}</span>
                    ))}
                  </div>
                </div>

                <div className="pg-card-footer">
                  <span className="pg-address">🏢 {pg.address}</span>
                  <a href={`tel:${pg.phone.replace(/\s+/g, '')}`} className="pg-call-btn">
                    📞 Call PG Owner ({pg.phone})
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
