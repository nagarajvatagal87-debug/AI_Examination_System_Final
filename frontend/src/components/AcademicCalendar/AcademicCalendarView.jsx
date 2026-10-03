import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import './AcademicCalendarView.css';

function getLocalDateStr(dateObj) {
  if (!dateObj) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AcademicCalendarView({ role = 'student' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'month' | 'week' | 'holidays'
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState([]);

  const [actionMsg, setActionMsg] = useState({ text: '', isError: false });

  // Form State for Create / Edit
  const initialFormState = {
    title: '',
    event_type: 'ACADEMIC',
    department_id: 'MCA',
    program: 'MCA',
    semester: 'III',
    academic_year: '2026-27',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:30 AM',
    end_time: '04:30 PM',
    description: '',
    remarks: '',
    location: 'MCA Department, DSATM',
    priority: 'NORMAL',
    status: 'PUBLISHED',
    audience: ['students', 'faculty', 'hod'],
    reason: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Current Month State for Month View
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2026, 9, 1)); // Default Oct 2026

  const isHod = role === 'hod' || role === 'principal';

  function fetchCalendarEvents() {
    setLoading(true);
    setError(null);

    const endpoint = isHod ? '/hod/calendar' : (role === 'faculty' ? '/faculty/calendar' : '/student/calendar');
    api.get(endpoint, {
      params: {
        eventType: selectedEventType !== 'ALL' ? selectedEventType : undefined,
        semester: selectedSemester !== 'ALL' ? selectedSemester : undefined,
        search: searchQuery || undefined,
      }
    })
      .then((res) => {
        setEvents(res.data || []);
      })
      .catch((err) => {
        console.error('Calendar load error:', err);
        setError('Failed to load academic calendar events.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchCalendarEvents();
  }, [selectedEventType, selectedSemester, searchQuery]);

  // Open Create Modal
  function handleOpenCreate() {
    setEditingEvent(null);
    setFormData(initialFormState);
    setShowFormModal(true);
  }

  // Open Edit Modal
  function handleOpenEdit(event, e) {
    if (e) e.stopPropagation();
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      event_type: event.event_type || 'ACADEMIC',
      department_id: event.department_id || 'MCA',
      program: event.program || 'MCA',
      semester: event.semester || 'III',
      academic_year: event.academic_year || '2026-27',
      start_date: event.start_date || new Date().toISOString().split('T')[0],
      end_date: event.end_date || event.start_date || new Date().toISOString().split('T')[0],
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      description: event.description || '',
      remarks: event.remarks || '',
      location: event.location || '',
      priority: event.priority || 'NORMAL',
      status: event.status || 'PUBLISHED',
      audience: Array.isArray(event.audience) ? event.audience : ['students', 'faculty'],
      reason: '',
    });
    setShowFormModal(true);
  }

  // Submit Form (Create or Edit)
  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setActionMsg({ text: 'Title is required.', isError: true });
      return;
    }

    try {
      if (editingEvent) {
        // Edit existing
        await api.put(`/academic-calendar/${editingEvent.id}`, formData);
        setActionMsg({ text: `✅ Updated "${formData.title}" successfully! Notifications sent if published.`, isError: false });
      } else {
        // Create new
        await api.post('/academic-calendar', formData);
        setActionMsg({ text: `✅ Created "${formData.title}" successfully!`, isError: false });
      }

      setShowFormModal(false);
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to save event.', isError: true });
    }
  }

  // Publish Draft
  async function handlePublish(eventId, e) {
    if (e) e.stopPropagation();
    try {
      await api.post(`/academic-calendar/${eventId}/publish`);
      setActionMsg({ text: '✅ Event officially published & audience notified!', isError: false });
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to publish event.', isError: true });
    }
  }

  // Cancel Event
  async function handleCancel(event, e) {
    if (e) e.stopPropagation();
    const reason = window.prompt(`Reason for cancelling "${event.title}":`, 'Administrative reschedule');
    if (reason === null) return;

    try {
      await api.post(`/academic-calendar/${event.id}/cancel`, { reason });
      setActionMsg({ text: `⚠️ Cancelled "${event.title}". Notifications sent.`, isError: false });
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to cancel event.', isError: true });
    }
  }

  // Duplicate Event
  async function handleDuplicate(eventId, e) {
    if (e) e.stopPropagation();
    try {
      await api.post(`/academic-calendar/${eventId}/duplicate`);
      setActionMsg({ text: '✅ Event duplicated to Draft status.', isError: false });
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to duplicate.', isError: true });
    }
  }

  // Delete Event
  async function handleDelete(eventId, e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/academic-calendar/${eventId}`);
      setActionMsg({ text: '🗑️ Event deleted.', isError: false });
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Failed to delete event.', isError: true });
    }
  }

  // Open Event Details Modal
  function handleOpenDetail(event) {
    api.get(`/academic-calendar/${event.id}`)
      .then((res) => setSelectedEventDetail(res.data))
      .catch(() => setSelectedEventDetail(event))
      .finally(() => setShowDetailModal(true));
  }

  // Handle Import Preview
  function handleParseImportText() {
    try {
      let parsed = [];
      if (importText.trim().startsWith('[')) {
        parsed = JSON.parse(importText);
      } else {
        // Plain text parsing line by line
        const lines = importText.split('\n').filter(l => l.trim());
        parsed = lines.map((line, idx) => {
          const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
          return {
            id: `imp-${idx}`,
            title: parts[0] ? parts[0].trim() : `Imported Event ${idx + 1}`,
            start_date: parts[1] ? parts[1].trim() : new Date().toISOString().split('T')[0],
            event_type: parts[2] ? parts[2].trim().toUpperCase() : 'ACADEMIC',
            status: 'PUBLISHED',
          };
        });
      }
      setImportPreview(parsed);
    } catch (e) {
      alert('Failed to parse text. Please ensure valid JSON or tab/comma separated values.');
    }
  }

  // Confirm Import
  async function handleConfirmImport() {
    if (importPreview.length === 0) return;
    try {
      await api.post('/academic-calendar/import', { events: importPreview });
      setActionMsg({ text: `✅ Successfully imported ${importPreview.length} official calendar events!`, isError: false });
      setShowImportModal(false);
      setImportText('');
      setImportPreview([]);
      fetchCalendarEvents();
    } catch (err) {
      setActionMsg({ text: err.response?.data?.error || 'Import failed.', isError: true });
    }
  }

  // Render Category Badge
  function renderBadge(eventType) {
    const typeUpper = (eventType || 'ACADEMIC').toUpperCase();
    let badgeClass = 'cal-badge-academic';
    let icon = '🎓';

    if (typeUpper === 'GENERAL_HOLIDAY') { badgeClass = 'cal-badge-general-holiday'; icon = '🇮🇳'; }
    else if (typeUpper === 'HOLIDAY') { badgeClass = 'cal-badge-holiday'; icon = '🌴'; }
    else if (typeUpper.includes('EXAM') || typeUpper === 'EXAMINATION') { badgeClass = 'cal-badge-examination'; icon = '📝'; }
    else if (typeUpper.includes('INTERNAL') || typeUpper === 'INTERNAL_ASSESSMENT') { badgeClass = 'cal-badge-internal'; icon = '📋'; }
    else if (typeUpper === 'WORKSHOP') { badgeClass = 'cal-badge-workshop'; icon = '🛠️'; }
    else if (typeUpper === 'PROJECT') { badgeClass = 'cal-badge-project'; icon = '💻'; }
    else if (typeUpper === 'DEADLINE') { badgeClass = 'cal-badge-deadline'; icon = '📌'; }
    else if (typeUpper === 'MEETING') { badgeClass = 'cal-badge-meeting'; icon = '👥'; }
    else if (typeUpper === 'PARENT_TEACHER') { badgeClass = 'cal-badge-parent'; icon = '👨‍👩‍👧'; }
    else if (typeUpper === 'AUDIT') { badgeClass = 'cal-badge-audit'; icon = '🔍'; }

    return <span className={`cal-badge ${badgeClass}`}>{icon} {eventType}</span>;
  }

  // Helper for Audience Checkboxes
  function toggleAudience(audKey) {
    const current = formData.audience || [];
    if (current.includes(audKey)) {
      setFormData({ ...formData, audience: current.filter(a => a !== audKey) });
    } else {
      setFormData({ ...formData, audience: [...current, audKey] });
    }
  }

  // Month Grid Calculation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });

  const monthGridDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    monthGridDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    monthGridDays.push(new Date(year, month, d));
  }

  return (
    <div className="cal-container">
      {/* Header & Controls */}
      <div className="cal-header">
        <div className="cal-title-section">
          <h2>📅 Department Academic Calendar</h2>
          <p className="cal-subtitle">
            Official Academic Schedule • III Semester MCA • Dayananda Sagar Academy of Technology and Management (DSATM)
          </p>
        </div>

        {isHod && (
          <div className="cal-actions">
            <button className="cal-btn cal-btn-primary" onClick={handleOpenCreate}>
              ➕ Create Event
            </button>
            <button className="cal-btn cal-btn-secondary" onClick={() => setShowImportModal(true)}>
              📥 Import Official Calendar
            </button>

          </div>
        )}
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

      {/* Toolbar: Views & Filters */}
      <div className="cal-toolbar">
        <div className="cal-tabs">
          <button className={`cal-tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            📋 List View
          </button>
          <button className={`cal-tab-btn ${activeTab === 'month' ? 'active' : ''}`} onClick={() => setActiveTab('month')}>
            📅 Month View
          </button>
          <button className={`cal-tab-btn ${activeTab === 'holidays' ? 'active' : ''}`} onClick={() => setActiveTab('holidays')}>
            🇮🇳 General Holidays
          </button>
        </div>

        <div className="cal-filters">
          <select className="cal-select" value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}>
            <option value="ALL">All Categories</option>
            <option value="ACADEMIC">Academic</option>
            <option value="EXAMINATION">Examination</option>
            <option value="INTERNAL_ASSESSMENT">Internal Assessment</option>
            <option value="PROJECT">Project</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="MEETING">Meeting</option>
            <option value="DEADLINE">Deadline</option>
            <option value="PARENT_TEACHER">Parent-Teacher</option>
            <option value="AUDIT">Audit</option>
            <option value="GENERAL_HOLIDAY">General Holiday</option>
          </select>

          <input
            type="text"
            className="cal-search-input"
            placeholder="🔍 Search schedule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: 40, fontWeight: 600 }}>
          Loading official academic calendar events...
        </p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#ef4444', padding: 20 }}>{error}</p>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          <h4 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: 16 }}>No Academic Events Found</h4>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {selectedEventType !== 'ALL' || searchQuery ? 'Try adjusting your filters or search terms.' : 'No calendar events have been published yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* LIST VIEW */}
          {activeTab === 'list' && (
            <div className="cal-table-wrapper">
              <table className="cal-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Event Schedule</th>
                    <th>Date & Time</th>
                    <th>Status / Timing</th>
                    <th>Audience</th>
                    {isHod && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const isTomorrow = ev.relative_state === 'TOMORROW';
                    const isToday = ev.relative_state === 'TODAY';
                    const isCancelled = ev.status === 'CANCELLED';

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => handleOpenDetail(ev)}
                        className={isTomorrow ? 'cal-row-tomorrow' : isToday ? 'cal-row-today' : ''}
                        style={{ cursor: 'pointer', opacity: isCancelled ? 0.6 : 1 }}
                      >
                        <td>{renderBadge(ev.event_type)}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{ev.title}</div>
                          {ev.location && <div style={{ fontSize: 12, color: '#64748b' }}>📍 {ev.location}</div>}
                          {isCancelled && <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚠️ CANCELLED</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#334155' }}>
                            {new Date(ev.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {ev.end_date && ev.end_date !== ev.start_date && (
                              ` - ${new Date(ev.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            )}
                          </div>
                          {(ev.start_time || ev.end_time) && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>⏰ {ev.start_time} - {ev.end_time}</div>
                          )}
                        </td>
                        <td>
                          {isTomorrow ? (
                            <span className="cal-badge cal-badge-tomorrow">⚡ TOMORROW</span>
                          ) : isToday ? (
                            <span className="cal-badge cal-badge-academic" style={{ background: '#2563eb', color: '#fff' }}>🔥 TODAY</span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{ev.relative_state}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 11, color: '#475569', textTransform: 'capitalize' }}>
                            {Array.isArray(ev.audience) ? ev.audience.join(', ') : 'All'}
                          </div>
                        </td>
                        {isHod && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="cal-btn cal-btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => handleOpenEdit(ev, e)}>
                                ✏️ Edit
                              </button>
                              {ev.status === 'DRAFT' && (
                                <button className="cal-btn cal-btn-success" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => handlePublish(ev.id, e)}>
                                  📢 Publish
                                </button>
                              )}
                              {ev.status === 'PUBLISHED' && (
                                <button className="cal-btn cal-btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => handleCancel(ev, e)}>
                                  🚫 Cancel
                                </button>
                              )}
                              <button className="cal-btn cal-btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => handleDuplicate(ev.id, e)}>
                                📑 Dup
                              </button>
                              <button className="cal-btn cal-btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => handleDelete(ev.id, e)}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* MONTH VIEW */}
          {activeTab === 'month' && (
            <div>
              <div className="cal-month-nav">
                <button
                  className="cal-btn cal-btn-secondary"
                  onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                >
                  ◀ {new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' })}
                </button>
                <h3>{monthName} {year}</h3>
                <button
                  className="cal-btn cal-btn-secondary"
                  onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                >
                  {new Date(year, month + 1, 1).toLocaleString('default', { month: 'short' })} ▶
                </button>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                color: '#334155',
                fontWeight: 600,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <span>📌 <strong>III Semester MCA Session:</strong> August 24, 2026 – December 12, 2026</span>
                <span style={{ color: '#64748b' }}>• Only specific daily events & general holidays highlighted with category light tints below</span>
              </div>

              <div className="cal-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="cal-grid-header">{d}</div>
                ))}

                {monthGridDays.map((dayObj, idx) => {
                  if (!dayObj) {
                    return <div key={`empty-${idx}`} className="cal-day-cell other-month" />;
                  }

                  const dayIso = getLocalDateStr(dayObj);
                  const todayIso = getLocalDateStr(new Date());

                  // Match events that start on this specific local day to ensure clean, non-repeating event placement
                  const dayEvents = events.filter((ev) => {
                    const start = ev.start_date || (ev.start_datetime ? ev.start_datetime.split('T')[0] : '');
                    return start === dayIso;
                  });

                  const isToday = todayIso === dayIso;
                  const isPastDay = dayIso < todayIso;

                  return (
                    <div
                      key={dayIso}
                      className={`cal-day-cell ${isToday ? 'today' : ''}`}
                      style={{
                        background: isToday ? '#eff6ff' : '#ffffff',
                        border: isToday ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        minHeight: 110,
                        padding: 8,
                      }}
                      onClick={() => {
                        if (dayEvents.length > 0) handleOpenDetail(dayEvents[0]);
                      }}
                    >
                      <div className="cal-day-num">
                        <span style={{ color: isToday ? '#2563eb' : '#1e293b', fontWeight: isToday ? 800 : 700 }}>
                          {dayObj.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: isPastDay ? '#94a3b8' : '#2563eb',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: 10
                          }}>
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="cal-day-events" style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {dayEvents.slice(0, 3).map((ev) => {
                          const isH = ev.event_type === 'GENERAL_HOLIDAY' || ev.event_type === 'HOLIDAY';
                          const isEx = (ev.event_type || '').includes('EXAM') || (ev.event_type || '').includes('INTERNAL');
                          const isWs = ev.event_type === 'WORKSHOP' || ev.event_type === 'PROJECT';
                          const isEvPast = ev.start_date < todayIso;

                          let chipBg = '#e0f2fe';
                          let chipColor = '#0369a1';
                          let chipBorder = '#7dd3fc';

                          if (isEvPast) {
                            chipBg = '#f1f5f9';
                            chipColor = '#64748b';
                            chipBorder = '#cbd5e1';
                          } else if (isH) {
                            chipBg = '#fee2e2';
                            chipColor = '#991b1b';
                            chipBorder = '#fca5a5';
                          } else if (isEx) {
                            chipBg = '#ede9fe';
                            chipColor = '#5b21b6';
                            chipBorder = '#c4b5fd';
                          } else if (isWs) {
                            chipBg = '#d1fae5';
                            chipColor = '#065f46';
                            chipBorder = '#6ee7b7';
                          }

                          return (
                            <div
                              key={ev.id}
                              style={{
                                background: chipBg,
                                color: chipColor,
                                border: `1px solid ${chipBorder}`,
                                padding: '4px 7px',
                                borderRadius: 6,
                                fontSize: 11,
                                lineHeight: '1.3',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                              }}
                              title={ev.title}
                            >
                              {isEvPast ? '✓ ' : (isH ? '🇮🇳 ' : isEx ? '📝 ' : isWs ? '🛠️ ' : '📅 ')}{ev.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GENERAL HOLIDAYS VIEW */}
          {activeTab === 'holidays' && (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #fffbe0 0%, #fef3c7 100%)',
                padding: '16px 20px',
                borderRadius: 12,
                border: '1.5px solid #fde047',
                marginBottom: 20
              }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#92400e', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🇮🇳 Official General Holidays & Institutional Off-Days
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>
                  Authoritative holidays published for III Semester MCA Program (August 2026 – December 2026).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {events.filter(e => e.event_type === 'GENERAL_HOLIDAY' || e.event_type === 'HOLIDAY').map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleOpenDetail(h)}
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: 16,
                      border: '1px solid #fed7aa',
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {h.relative_state === 'TOMORROW' && (
                      <span className="cal-badge cal-badge-tomorrow" style={{ position: 'absolute', top: 12, right: 12 }}>
                        ⚡ TOMORROW
                      </span>
                    )}

                    <div style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', marginBottom: 4 }}>
                      🗓️ {new Date(h.start_date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: 16, fontWeight: 800 }}>
                      {h.title}
                    </h4>

                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      {h.description || 'No regular academic activities scheduled.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {showFormModal && (
        <div className="cal-modal-overlay">
          <div className="cal-modal-content">
            <div className="cal-modal-header">
              <h3>{editingEvent ? '✏️ Edit Calendar Event' : '➕ Create Official Academic Event'}</h3>
              <button className="cal-close-btn" onClick={() => setShowFormModal(false)}>✖</button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="cal-form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  className="cal-form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Workshop on DevOps in Action"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="cal-form-group">
                  <label>Event Type *</label>
                  <select
                    className="cal-form-select"
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  >
                    <option value="ACADEMIC">ACADEMIC</option>
                    <option value="EXAMINATION">EXAMINATION</option>
                    <option value="INTERNAL_ASSESSMENT">INTERNAL_ASSESSMENT</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="MEETING">MEETING</option>
                    <option value="DEADLINE">DEADLINE</option>
                    <option value="PARENT_TEACHER">PARENT_TEACHER</option>
                    <option value="AUDIT">AUDIT</option>
                    <option value="GENERAL_HOLIDAY">GENERAL_HOLIDAY</option>
                    <option value="STUDENT_ACTIVITY">STUDENT_ACTIVITY</option>
                    <option value="FACULTY_ACTIVITY">FACULTY_ACTIVITY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div className="cal-form-group">
                  <label>Program / Semester</label>
                  <input
                    type="text"
                    className="cal-form-input"
                    value={`${formData.program} Sem ${formData.semester}`}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="cal-form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    className="cal-form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="cal-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    className="cal-form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="cal-form-group">
                <label>Location</label>
                <input
                  type="text"
                  className="cal-form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. MCA Seminar Hall"
                />
              </div>

              <div className="cal-form-group">
                <label>Audience (Select visible groups)</label>
                <div className="cal-checkbox-grid">
                  {['students', 'faculty', 'hod', 'exam_dept', 'principal'].map((aud) => (
                    <label key={aud} className="cal-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(formData.audience || []).includes(aud)}
                        onChange={() => toggleAudience(aud)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{aud.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="cal-form-group">
                <label>Description / Notes</label>
                <textarea
                  className="cal-form-textarea"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief details about the academic activity..."
                />
              </div>

              {editingEvent && (
                <div className="cal-form-group">
                  <label>Reason for Modification</label>
                  <input
                    type="text"
                    className="cal-form-input"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g. Date adjusted as per university circular"
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="cal-btn cal-btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cal-btn cal-btn-primary">
                  {editingEvent ? 'Save Changes' : 'Publish / Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {showDetailModal && selectedEventDetail && (
        <div className="cal-modal-overlay">
          <div className="cal-modal-content">
            <div className="cal-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {renderBadge(selectedEventDetail.event_type)}
                {selectedEventDetail.relative_state === 'TOMORROW' && (
                  <span className="cal-badge cal-badge-tomorrow">⚡ TOMORROW</span>
                )}
              </div>
              <button className="cal-close-btn" onClick={() => setShowDetailModal(false)}>✖</button>
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: 20, color: '#0f172a' }}>
              {selectedEventDetail.title}
            </h3>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              <div style={{ margin: '4px 0', color: '#334155' }}>
                📅 <strong>Date:</strong> {selectedEventDetail.start_date}
                {selectedEventDetail.end_date && selectedEventDetail.end_date !== selectedEventDetail.start_date && (
                  ` to ${selectedEventDetail.end_date}`
                )}
              </div>
              {selectedEventDetail.location && (
                <div style={{ margin: '4px 0', color: '#334155' }}>
                  📍 <strong>Location:</strong> {selectedEventDetail.location}
                </div>
              )}
              <div style={{ margin: '4px 0', color: '#334155' }}>
                👥 <strong>Audience:</strong> {Array.isArray(selectedEventDetail.audience) ? selectedEventDetail.audience.join(', ') : 'All'}
              </div>
              <div style={{ margin: '4px 0', color: '#334155' }}>
                📌 <strong>Status:</strong> {selectedEventDetail.status}
              </div>
            </div>

            {selectedEventDetail.description && (
              <div style={{ marginBottom: 16 }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#475569' }}>Description</h5>
                <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
                  {selectedEventDetail.description}
                </p>
              </div>
            )}

            {selectedEventDetail.remarks && (
              <div style={{ marginBottom: 16 }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#475569' }}>Remarks</h5>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {selectedEventDetail.remarks}
                </p>
              </div>
            )}

            {/* Revision History */}
            {selectedEventDetail.history && selectedEventDetail.history.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#475569' }}>📜 Audit & Revision Trail</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedEventDetail.history.map((h, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>
                      <strong>{h.action}</strong> by {h.changed_by} on {new Date(h.changed_at).toLocaleString()}
                      {h.reason && ` • Reason: ${h.reason}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="cal-btn cal-btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="cal-modal-overlay">
          <div className="cal-modal-content">
            <div className="cal-modal-header">
              <h3>📥 Import Official Academic Calendar</h3>
              <button className="cal-close-btn" onClick={() => setShowImportModal(false)}>✖</button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px 0' }}>
              Paste JSON or CSV entries extracted from official institutional document. Data will be previewed before publishing.
            </p>

            <textarea
              className="cal-form-textarea"
              rows="6"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON array or tab/comma-separated lines..."
            />

            <button className="cal-btn cal-btn-secondary" style={{ marginTop: 8 }} onClick={handleParseImportText}>
              🔍 Parse & Preview Entries
            </button>

            {importPreview.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Preview Extracted Rows ({importPreview.length})</h5>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                  {importPreview.map((item, idx) => (
                    <div key={idx} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <strong>{item.title}</strong> — {item.start_date} ({item.event_type})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="cal-btn cal-btn-secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button className="cal-btn cal-btn-primary" disabled={importPreview.length === 0} onClick={handleConfirmImport}>
                Import to Database & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
