import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import './SportsManagementView.css';

export default function SportsManagementView({ role = 'student' }) {
  const [events, setEvents] = useState([]);
  const [sportsMaster, setSportsMaster] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'registered' | 'teams' | 'past' | 'achievements' | 'master' | 'manage'
  const [selectedSportId, setSelectedSportId] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Actions State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ event_id: '', team_name: '', captain_id: '', member_ids: [] });

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultForm, setResultForm] = useState({ event_id: '', winner: '', runner_up: '', third_place: '', score_details: '' });

  const [showAddSportModal, setShowAddSportModal] = useState(false);
  const [newSportData, setNewSportData] = useState({ name: '', description: '', type: 'TEAM', icon: '🏆' });

  const [conflictWarning, setConflictWarning] = useState('');
  const [actionMsg, setActionMsg] = useState({ text: '', isError: false });

  const [facultyList, setFacultyList] = useState([]);

  const isHod = role === 'hod' || role === 'dept_coordinator';
  const isSportsCoordinator = role === 'sports_coordinator';
  const isPrincipal = role === 'principal';
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';

  const initialEventForm = {
    event_name: '',
    sport_id: '',
    event_level: isHod ? 'DEPARTMENT' : 'COLLEGE',
    department_id: 'MCA',
    eligible_department_ids: ['MCA', 'CSE', 'ECE', 'ISE'],
    assigned_faculty_id: '',
    assigned_faculty_name: '',
    academic_year: '2026-27',
    semester: 'ALL',
    event_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00 AM',
    end_time: '05:00 PM',
    venue: 'DSATM Main Sports Ground',
    max_participants: 60,
    team_size: 11,
    type: 'TEAM',
    description: '',
    rules: '',
    eligibility_criteria: 'All registered students in the eligible department/college.',
    status: isHod ? 'ASSIGNED' : 'PUBLISHED',
  };

  const [eventFormData, setEventFormData] = useState(initialEventForm);

  // Load Data
  function loadData() {
    setLoading(true);
    setError(null);

    Promise.all([
      api.get('/sports/events', {
        params: {
          eventLevel: selectedLevel !== 'ALL' ? selectedLevel : undefined,
          sportId: selectedSportId !== 'ALL' ? selectedSportId : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: searchQuery || undefined,
        },
      }),
      api.get('/sports/master'),
      api.get('/sports/achievements'),
      api.get('/sports/stats'),
      api.get('/sports/department-faculty').catch(() => ({ data: [] })),
    ])
      .then(([eventsRes, masterRes, achRes, statsRes, facultyRes]) => {
        setEvents(eventsRes.data || []);
        setSportsMaster(masterRes.data || []);
        setAchievements(achRes.data || []);
        setStats(statsRes.data || null);
        setFacultyList(facultyRes.data || []);
      })
      .catch((err) => {
        console.error('Sports data load error:', err);
        setError('Failed to load sports module data.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [selectedSportId, selectedLevel, selectedStatus, searchQuery]);

  // Handle Venue Conflict Check on Event Form Change
  async function handleVenueConflictCheck(venue, eventDate, startTime, endTime) {
    if (!venue || !eventDate) {
      setConflictWarning('');
      return;
    }
    try {
      const res = await api.get('/sports/conflict-check', {
        params: { venue, eventDate, startTime, endTime, excludeEventId: editingEvent?.id },
      });
      if (res.data.hasConflict) {
        setConflictWarning(`⚠️ Venue Conflict: Event "${res.data.conflictingEvent.event_name}" is already scheduled at ${venue} on ${eventDate}.`);
      } else {
        setConflictWarning('');
      }
    } catch (e) {}
  }

  // Submit Create / Edit Event
  async function handleSubmitEventForm(e) {
    e.preventDefault();
    if (!eventFormData.event_name.trim() || !eventFormData.sport_id) {
      setActionMsg({ text: 'Event Name and Sport Selection are required.', isError: true });
      return;
    }

    try {
      if (editingEvent) {
        await api.put(`/sports/events/${editingEvent.id}`, eventFormData);
        setActionMsg({ text: `✅ Updated "${eventFormData.event_name}" successfully!`, isError: false });
      } else {
        await api.post('/sports/events', eventFormData);
        setActionMsg({ text: `✅ Created "${eventFormData.event_name}" successfully!`, isError: false });
      }
      setShowEventModal(false);
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to save sports event.', isError: true });
    }
  }

  // Publish / Cancel / Delete Event
  async function handlePublishEvent(eventId) {
    try {
      await api.post(`/sports/events/${eventId}/publish`);
      setActionMsg({ text: '✅ Sports event published & calendar updated!', isError: false });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Publish failed.', isError: true });
    }
  }

  async function handleCancelEvent(event) {
    const reason = window.prompt(`Reason for cancelling "${event.event_name}":`, 'Unfavorable weather conditions');
    if (reason === null) return;
    try {
      await api.post(`/sports/events/${event.id}/cancel`, { reason });
      setActionMsg({ text: `⚠️ Cancelled "${event.event_name}". Notifications dispatched.`, isError: false });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Cancellation failed.', isError: true });
    }
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm('Delete this sports event permanently?')) return;
    try {
      await api.delete(`/sports/events/${eventId}`);
      setActionMsg({ text: '🗑️ Sports event deleted.', isError: false });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Delete failed.', isError: true });
    }
  }

  // Student Register / Unregister
  async function handleRegister(eventId) {
    setActionMsg({ text: 'Processing sports registration...', isError: false });
    try {
      const res = await api.post(`/sports/events/${eventId}/register`);
      setActionMsg({ text: `🎉 ${res.data.message}`, isError: false });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Registration failed.', isError: true });
    }
  }

  async function handleUnregister(eventId) {
    if (!window.confirm('Cancel your registration for this sports event?')) return;
    try {
      await api.post(`/sports/events/${eventId}/unregister`);
      setActionMsg({ text: 'Registration cancelled.', isError: false });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Cancel registration failed.', isError: true });
    }
  }

  // Add Sport to Master Data
  async function handleAddMasterSport(e) {
    e.preventDefault();
    if (!newSportData.name.trim()) return;
    try {
      await api.post('/sports/master', newSportData);
      setActionMsg({ text: `✅ Added "${newSportData.name}" to Master Sports database!`, isError: false });
      setShowAddSportModal(false);
      setNewSportData({ name: '', description: '', type: 'TEAM', icon: '🏆' });
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to add sport to master data.', isError: true });
    }
  }

  // Record Tournament Result
  async function handlePublishResultSubmit(e) {
    e.preventDefault();
    if (!resultForm.event_id || !resultForm.winner) return;
    try {
      await api.post(`/sports/events/${resultForm.event_id}/result`, resultForm);
      setActionMsg({ text: '🥇 Tournament results published & achievements generated!', isError: false });
      setShowResultModal(false);
      loadData();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to publish result.', isError: true });
    }
  }

  // Open Event Detail Modal
  function handleOpenDetail(event) {
    api.get(`/sports/events/${event.id}`)
      .then((res) => setSelectedEventDetail(res.data))
      .catch(() => setSelectedEventDetail(event))
      .finally(() => setShowDetailModal(true));
  }

  // Filtered Events depending on Active Tab
  const registeredEvents = events.filter((e) => e.is_student_registered);
  const pastEvents = events.filter((e) => e.status === 'COMPLETED' || e.status === 'CANCELLED');
  const upcomingEvents = events.filter((e) => e.status === 'PUBLISHED' || e.status === 'REGISTRATION_OPEN' || e.status === 'REGISTRATION_CLOSED');
  const assignedEvents = events.filter((e) => e.status === 'ASSIGNED' || e.status === 'DRAFT');

  return (
    <div className="sports-container">
      {/* Header */}
      <div className="sports-header">
        <div className="sports-title-section">
          <h2>🏆 Sports Management Module</h2>
          <p className="sports-subtitle">
            Central College & Department-Level Sports Workflow • Dayananda Sagar Academy of Technology & Management
          </p>
        </div>

        <div className="sports-actions">
          {(isHod || isSportsCoordinator || isFaculty) && (
            <button
              className="sports-btn sports-btn-primary"
              onClick={() => {
                setEditingEvent(null);
                setEventFormData({
                  ...initialEventForm,
                  event_level: isSportsCoordinator ? 'COLLEGE' : 'DEPARTMENT',
                  sport_id: sportsMaster.length > 0 ? sportsMaster[0].id : '',
                });
                setShowEventModal(true);
              }}
            >
              ➕ Create Sports Event
            </button>
          )}

          {isSportsCoordinator && (
            <button className="sports-btn sports-btn-secondary" onClick={() => setShowAddSportModal(true)}>
              ⚙️ Manage Master Sports DB
            </button>
          )}
        </div>
      </div>

      {actionMsg.text && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontWeight: 700,
          fontSize: 13,
          background: actionMsg.isError ? '#fee2e2' : '#d1fae5',
          color: actionMsg.isError ? '#991b1b' : '#065f46',
          border: `1px solid ${actionMsg.isError ? '#fecaca' : '#a7f3d0'}`
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* Real Aggregated Stats Cards */}
      {stats && (
        <div className="sports-stats-grid">
          <div className="sports-stat-card">
            <span className="sports-stat-val">{stats.total_events || 0}</span>
            <span className="sports-stat-label">Total Sports Events</span>
          </div>
          <div className="sports-stat-card">
            <span className="sports-stat-val" style={{ color: '#10b981' }}>{stats.upcoming_events || 0}</span>
            <span className="sports-stat-label">Upcoming / Active</span>
          </div>
          <div className="sports-stat-card">
            <span className="sports-stat-val" style={{ color: '#2563eb' }}>{stats.registered_students || 0}</span>
            <span className="sports-stat-label">Total Registered Players</span>
          </div>
          <div className="sports-stat-card">
            <span className="sports-stat-val" style={{ color: '#8b5cf6' }}>{stats.completed_events || 0}</span>
            <span className="sports-stat-label">Completed Tournaments</span>
          </div>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="sports-toolbar">
        <div className="sports-tabs">
          <button className={`sports-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            🏆 Upcoming Sports
          </button>
          {(isFaculty || isHod) && (
            <button className={`sports-tab-btn ${activeTab === 'assigned' ? 'active' : ''}`} onClick={() => setActiveTab('assigned')}>
              🎯 Assigned Events ({assignedEvents.length})
            </button>
          )}
          {isStudent && (
            <button className={`sports-tab-btn ${activeTab === 'registered' ? 'active' : ''}`} onClick={() => setActiveTab('registered')}>
              📝 Registered Sports ({registeredEvents.length})
            </button>
          )}
          <button className={`sports-tab-btn ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
            📜 Past Events & Results
          </button>
          <button className={`sports-tab-btn ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>
            🥇 Achievements
          </button>
        </div>

        <div className="sports-filters">
          <select className="sports-select" value={selectedSportId} onChange={(e) => setSelectedSportId(e.target.value)}>
            <option value="ALL">All Sports</option>
            {sportsMaster.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>

          <select className="sports-select" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
            <option value="ALL">All Levels</option>
            <option value="COLLEGE">College-Wide</option>
            <option value="DEPARTMENT">Department-Wise</option>
          </select>

          <input
            type="text"
            className="sports-search-input"
            placeholder="🔍 Search sports, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: 40, fontWeight: 600 }}>
          Loading sports module data from database...
        </p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#ef4444', padding: 20 }}>{error}</p>
      ) : (
        <>
          {/* TAB 1: UPCOMING SPORTS */}
          {activeTab === 'upcoming' && (
            <div>
              {upcomingEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Upcoming Sports Events</h4>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    There are currently no upcoming sports events published in the database.
                  </p>
                </div>
              ) : (
                <div className="sports-cards-grid">
                  {upcomingEvents.map((ev) => {
                    const capPercent = ev.max_participants ? Math.min(100, Math.round((ev.registered_count / ev.max_participants) * 100)) : 0;
                    return (
                      <div key={ev.id} className="sports-event-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span className={`sports-card-badge ${ev.event_level === 'COLLEGE' ? 'badge-level-college' : 'badge-level-dept'}`}>
                            {ev.event_level === 'COLLEGE' ? '🏛️ College-Wide' : `🏫 ${ev.department_id || 'Dept'} Event`}
                          </span>
                          <span className={`sports-card-badge ${ev.is_full ? 'badge-status-closed' : 'badge-status-open'}`}>
                            {ev.is_full ? 'CLOSED' : 'OPEN'}
                          </span>
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                          {ev.event_name}
                        </h3>

                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div>📍 <strong>Venue:</strong> {ev.venue}</div>
                          <div>📅 <strong>Date:</strong> {new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ({ev.start_time})</div>
                          <div>👥 <strong>Team Size:</strong> {ev.team_size > 1 ? `${ev.team_size} Players (Team)` : 'Individual'}</div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            <span>Registrations: {ev.registered_count} / {ev.max_participants}</span>
                            <span>{capPercent}%</span>
                          </div>
                          <div className="sports-cap-bar">
                            <div className="sports-cap-fill" style={{ width: `${capPercent}%` }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                          <button className="sports-btn sports-btn-secondary" style={{ flex: 1 }} onClick={() => handleOpenDetail(ev)}>
                            View Details
                          </button>

                          {isStudent && (
                            ev.is_student_registered ? (
                              <button className="sports-btn sports-btn-danger" style={{ flex: 1 }} onClick={() => handleUnregister(ev.id)}>
                                Cancel Reg
                              </button>
                            ) : (
                              <button
                                className="sports-btn sports-btn-primary"
                                style={{ flex: 1 }}
                                disabled={ev.is_full}
                                onClick={() => handleRegister(ev.id)}
                              >
                                {ev.is_full ? 'Full' : 'Register Now'}
                              </button>
                            )
                          )}

                          {(isHod || isSportsCoordinator) && (
                            <button className="sports-btn sports-btn-secondary" onClick={() => handlePublishEvent(ev.id)}>
                              📢
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ASSIGNED EVENTS (FACULTY WORKFLOW) */}
          {activeTab === 'assigned' && (
            <div>
              {assignedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Pending Assigned Events</h4>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    You currently have no draft or pending sports events assigned to you for coordination.
                  </p>
                </div>
              ) : (
                <div className="sports-cards-grid">
                  {assignedEvents.map((ev) => (
                    <div key={ev.id} className="sports-event-card" style={{ border: '2px dashed #3b82f6', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span className="sports-card-badge badge-level-dept">
                          🏫 {ev.department_id || 'Dept'} Event
                        </span>
                        <span className="sports-card-badge badge-status-closed">
                          {ev.status}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                        {ev.event_name}
                      </h3>

                      <div style={{ fontSize: 13, color: '#475569', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div>📍 <strong>Venue:</strong> {ev.venue}</div>
                        <div>📅 <strong>Date:</strong> {ev.event_date} ({ev.start_time})</div>
                        <div>👨‍🏫 <strong>Assigned Coordinator:</strong> {ev.assigned_faculty_name || 'Faculty Member'}</div>
                      </div>

                      <p style={{ fontSize: 12, color: '#ca8a04', background: '#fef9c3', padding: '8px 12px', borderRadius: 6, fontWeight: 600, margin: '0 0 14px 0' }}>
                        ⚠️ Event status: <strong>{ev.status}</strong>. Click <strong>Publish Event</strong> to publish it to students and update the Academic Calendar.
                      </p>

                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <button
                          className="sports-btn sports-btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setEditingEvent(ev);
                            setEventFormData({
                              ...initialEventForm,
                              ...ev,
                              status: 'PUBLISHED',
                            });
                            setShowEventModal(true);
                          }}
                        >
                          ✏️ Edit Details
                        </button>
                        <button
                          className="sports-btn sports-btn-primary"
                          style={{ flex: 1 }}
                          onClick={() => handlePublishEvent(ev.id)}
                        >
                          📢 Publish Event
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'registered' && (
            <div>
              {registeredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Active Sports Registrations</h4>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    You have not registered for any upcoming sports events yet. Browse "Upcoming Sports" to register!
                  </p>
                </div>
              ) : (
                <table className="sports-table">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th>Event Name</th>
                      <th>Level</th>
                      <th>Date & Time</th>
                      <th>Venue</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 800, color: '#10b981' }}>{ev.sport_name}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{ev.event_name}</td>
                        <td>{ev.event_level}</td>
                        <td>{ev.event_date} ({ev.start_time})</td>
                        <td>{ev.venue}</td>
                        <td><span className="sports-card-badge badge-status-open">REGISTERED</span></td>
                        <td>
                          <button className="sports-btn sports-btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleUnregister(ev.id)}>
                            Cancel Registration
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: PAST EVENTS & RESULTS */}
          {activeTab === 'past' && (
            <div>
              {pastEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Completed Tournaments</h4>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    No sports tournament results have been published yet in the database.
                  </p>
                </div>
              ) : (
                <table className="sports-table">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th>Tournament Name</th>
                      <th>Level</th>
                      <th>Winner</th>
                      <th>Runner-Up</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{ev.sport_name}</td>
                        <td style={{ fontWeight: 800, color: '#2563eb' }}>{ev.event_name}</td>
                        <td>{ev.event_level}</td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>🥇 {ev.result?.winner || 'Pending'}</td>
                        <td style={{ color: '#64748b' }}>🥈 {ev.result?.runner_up || 'Pending'}</td>
                        <td>
                          <span className={`sports-card-badge ${ev.status === 'COMPLETED' ? 'badge-status-open' : 'badge-status-closed'}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td>
                          <button className="sports-btn sports-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleOpenDetail(ev)}>
                            View Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: SPORTS ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div>
              {achievements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Sports Achievements Found</h4>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    Sports achievements generated from tournament results will appear here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {achievements.map((ach) => (
                    <div key={ach.id} style={{ background: '#ffffff', borderRadius: 12, padding: 18, border: '1.5px solid #fde047', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase' }}>
                        🥇 {ach.position} • {ach.category}
                      </div>
                      <h4 style={{ margin: '4px 0 8px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                        {ach.achievement_title}
                      </h4>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                        {ach.description}
                      </p>
                      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                        Awarded to: <strong>{ach.student_name}</strong> ({ach.department_id})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {showEventModal && (
        <div className="sports-modal-overlay">
          <div className="sports-modal-content">
            <div className="sports-modal-header">
              <h3>{editingEvent ? '✏️ Edit Sports Event' : '➕ Create New Sports Event'}</h3>
              <button className="sports-close-btn" onClick={() => setShowEventModal(false)}>✖</button>
            </div>

            {conflictWarning && (
              <div className="sports-warning-box">
                {conflictWarning}
              </div>
            )}

            <form onSubmit={handleSubmitEventForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Event Name *</label>
                  <input
                    type="text"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.event_name}
                    onChange={(e) => setEventFormData({ ...eventFormData, event_name: e.target.value })}
                    placeholder="e.g. MCA Cricket Tournament 2026"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Select Sport *</label>
                  <select
                    className="sports-select"
                    style={{ width: '100%' }}
                    value={eventFormData.sport_id}
                    onChange={(e) => setEventFormData({ ...eventFormData, sport_id: e.target.value })}
                    required
                  >
                    <option value="">Select Sport...</option>
                    {sportsMaster.map((s) => (
                      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Event Level *</label>
                  <select
                    className="sports-select"
                    style={{ width: '100%' }}
                    value={eventFormData.event_level}
                    onChange={(e) => setEventFormData({ ...eventFormData, event_level: e.target.value })}
                  >
                    <option value="DEPARTMENT">DEPARTMENT</option>
                    <option value="COLLEGE">COLLEGE-WIDE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Host Department</label>
                  <input
                    type="text"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.department_id}
                    onChange={(e) => setEventFormData({ ...eventFormData, department_id: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Max Participants *</label>
                  <input
                    type="number"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.max_participants}
                    onChange={(e) => setEventFormData({ ...eventFormData, max_participants: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Assign Faculty Coordinator (HOD Workflow)
                  </label>
                  <select
                    className="sports-select"
                    style={{ width: '100%' }}
                    value={eventFormData.assigned_faculty_id || ''}
                    onChange={(e) => {
                      const selectedFac = facultyList.find((f) => f.id === e.target.value);
                      setEventFormData({
                        ...eventFormData,
                        assigned_faculty_id: e.target.value,
                        assigned_faculty_name: selectedFac ? selectedFac.full_name : '',
                        status: e.target.value && eventFormData.status === 'PUBLISHED' ? 'ASSIGNED' : eventFormData.status,
                      });
                    }}
                  >
                    <option value="">No specific faculty (Publish immediately)</option>
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        👨‍🏫 {f.full_name} ({f.department_id || 'Faculty'} - {f.designation || 'Faculty'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Publication Status</label>
                  <select
                    className="sports-select"
                    style={{ width: '100%' }}
                    value={eventFormData.status || 'PUBLISHED'}
                    onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value })}
                  >
                    <option value="PUBLISHED">PUBLISHED (Notify Students & Link to Academic Calendar)</option>
                    <option value="ASSIGNED">ASSIGNED / DRAFT (Notify Assigned Faculty Only)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Event Date *</label>
                  <input
                    type="date"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.event_date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEventFormData({ ...eventFormData, event_date: newDate });
                      handleVenueConflictCheck(eventFormData.venue, newDate, eventFormData.start_time, eventFormData.end_time);
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Start Time</label>
                  <input
                    type="text"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.start_time}
                    onChange={(e) => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                    placeholder="09:00 AM"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Venue *</label>
                  <input
                    type="text"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={eventFormData.venue}
                    onChange={(e) => {
                      const newVenue = e.target.value;
                      setEventFormData({ ...eventFormData, venue: newVenue });
                      handleVenueConflictCheck(newVenue, eventFormData.event_date, eventFormData.start_time, eventFormData.end_time);
                    }}
                    placeholder="DSATM Sports Ground"
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Description / Event Guidelines</label>
                <textarea
                  className="sports-search-input"
                  style={{ width: '100%', height: 70 }}
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="Official tournament details..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="sports-btn sports-btn-secondary" onClick={() => setShowEventModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sports-btn sports-btn-primary">
                  {editingEvent ? 'Save Changes' : 'Create & Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {showDetailModal && selectedEventDetail && (
        <div className="sports-modal-overlay">
          <div className="sports-modal-content">
            <div className="sports-modal-header">
              <h3>🏆 {selectedEventDetail.event_name}</h3>
              <button className="sports-close-btn" onClick={() => setShowDetailModal(false)}>✖</button>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              <div>📍 <strong>Venue:</strong> {selectedEventDetail.venue}</div>
              <div>📅 <strong>Date & Time:</strong> {selectedEventDetail.event_date} ({selectedEventDetail.start_time})</div>
              <div>👥 <strong>Registrations:</strong> {selectedEventDetail.registered_count || 0} / {selectedEventDetail.max_participants || 60}</div>
              <div>📌 <strong>Level:</strong> {selectedEventDetail.event_level}</div>
            </div>

            {selectedEventDetail.description && (
              <div style={{ marginBottom: 14 }}>
                <h5 style={{ margin: '0 0 4px 0' }}>Description</h5>
                <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{selectedEventDetail.description}</p>
              </div>
            )}

            {/* Registration Table for HOD/Coordinators */}
            {(isHod || isSportsCoordinator) && selectedEventDetail.registrations && selectedEventDetail.registrations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Registered Students ({selectedEventDetail.registrations.length})</h5>
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  <table className="sports-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr><th>Student Name</th><th>USN</th><th>Dept</th><th>Sem</th></tr>
                    </thead>
                    <tbody>
                      {selectedEventDetail.registrations.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700 }}>{r.student_name}</td>
                          <td>{r.usn}</td>
                          <td>{r.department_id}</td>
                          <td>Sem {r.semester}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="sports-btn sports-btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE MASTER SPORTS MODAL */}
      {showAddSportModal && (
        <div className="sports-modal-overlay">
          <div className="sports-modal-content">
            <div className="sports-modal-header">
              <h3>⚙️ Add New Sport to Master Data</h3>
              <button className="sports-close-btn" onClick={() => setShowAddSportModal(false)}>✖</button>
            </div>

            <form onSubmit={handleAddMasterSport}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Sport Name *</label>
                <input
                  type="text"
                  className="sports-search-input"
                  style={{ width: '100%' }}
                  value={newSportData.name}
                  onChange={(e) => setNewSportData({ ...newSportData, name: e.target.value })}
                  placeholder="e.g. Swimming, Hockey"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Sport Type</label>
                  <select
                    className="sports-select"
                    style={{ width: '100%' }}
                    value={newSportData.type}
                    onChange={(e) => setNewSportData({ ...newSportData, type: e.target.value })}
                  >
                    <option value="TEAM">TEAM</option>
                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Icon Emoji</label>
                  <input
                    type="text"
                    className="sports-search-input"
                    style={{ width: '100%' }}
                    value={newSportData.icon}
                    onChange={(e) => setNewSportData({ ...newSportData, icon: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="sports-btn sports-btn-secondary" onClick={() => setShowAddSportModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="sports-btn sports-btn-primary">
                  Save Sport Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
