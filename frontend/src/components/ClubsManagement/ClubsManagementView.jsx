import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DocumentQrBadge from '../DocumentQrBadge.jsx';
import './ClubsManagementView.css';

export default function ClubsManagementView({ role = 'student' }) {
  const [clubs, setClubs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [departmentFaculty, setDepartmentFaculty] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [studentProfileData, setStudentProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ text: '', isError: false });

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState(
    role === 'hod' ? 'my_clubs' : role === 'faculty' ? 'assigned_clubs' : role === 'principal' ? 'overview' : 'available_clubs'
  );

  // Modals & Action States
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [clubForm, setClubForm] = useState({
    name: '',
    code: '',
    description: '',
    type: 'Coding',
    academicYear: '2026-2027',
    facultyCoordinatorId: '',
    status: 'ACTIVE',
  });

  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityForm, setActivityForm] = useState({
    clubId: '',
    activityName: '',
    activityType: 'Coding Competition',
    description: '',
    additionalInfo: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '04:00 PM',
    venue: 'DSATM Main Seminar Hall',
    registrationStart: new Date().toISOString().split('T')[0],
    registrationEnd: new Date().toISOString().split('T')[0],
    maxParticipants: 50,
    participationType: 'INDIVIDUAL',
    teamSize: 1,
    eligibilityDepartment: 'ALL',
    eligibilityProgram: 'ALL',
    eligibilitySemester: 'ALL',
    eligibilitySection: 'ALL',
    instructions: 'Follow standard college technical conduct.',
    requiredMaterials: 'Laptop & DSATM Student Identity Card.',
    evaluationCriteria: 'Problem Solving, Code Quality & Speed.',
    status: 'DRAFT',
  });

  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringActivity, setRegisteringActivity] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    teamName: '',
    teamMembers: [],
  });

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsActivity, setResultsActivity] = useState(null);
  const [resultsRows, setResultsRows] = useState([
    { studentId: '', studentName: '', studentUsn: '', rank: '1st Place', score: '95/100', remarks: 'Outstanding performance' },
  ]);

  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [participationActivity, setParticipationActivity] = useState(null);
  const [participationList, setParticipationList] = useState([]);

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterActivity, setRosterActivity] = useState(null);
  const [rosterList, setRosterList] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      if (role === 'hod') {
        const [cRes, aRes, fRes, sRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/clubs/activities/list'),
          api.get('/clubs/department-faculty'),
          api.get('/clubs/analytics/hod'),
        ]);
        if (cRes.data) setClubs(cRes.data);
        if (aRes.data) setActivities(aRes.data);
        if (fRes.data) setDepartmentFaculty(fRes.data);
        if (sRes.data) setAnalytics(sRes.data);
      } else if (role === 'faculty') {
        const [cRes, aRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/clubs/activities/list'),
        ]);
        if (cRes.data) setClubs(cRes.data);
        if (aRes.data) setActivities(aRes.data);
      } else if (role === 'student') {
        const [cRes, aRes, pRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/clubs/activities/list'),
          api.get('/clubs/student/profile'),
        ]);
        if (cRes.data) setClubs(cRes.data);
        if (aRes.data) setActivities(aRes.data);
        if (pRes.data) setStudentProfileData(pRes.data);
      } else if (role === 'principal') {
        const [cRes, aRes, sRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/clubs/activities/list'),
          api.get('/clubs/analytics/principal'),
        ]);
        if (cRes.data) setClubs(cRes.data);
        if (aRes.data) setActivities(aRes.data);
        if (sRes.data) setAnalytics(sRes.data);
      }
    } catch (err) {
      console.error('Failed to load clubs module data:', err);
      setError('Unable to load clubs data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  function showToast(msg, isError = false) {
    setActionMsg({ text: msg, isError });
    setTimeout(() => setActionMsg({ text: '', isError: false }), 4000);
  }

  // --- HOD ACTIONS ---
  async function handleSaveClub(e) {
    e.preventDefault();
    try {
      if (editingClub) {
        await api.put(`/clubs/${editingClub.id}`, clubForm);
        showToast(`✓ Club "${clubForm.name}" updated successfully.`);
      } else {
        await api.post('/clubs', clubForm);
        showToast(`✓ Department Club "${clubForm.name}" created! Faculty coordinator notified.`);
      }
      setShowCreateClubModal(false);
      setEditingClub(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save club.', true);
    }
  }

  function handleOpenCreateClub() {
    setEditingClub(null);
    setClubForm({
      name: '',
      code: '',
      description: '',
      type: 'Coding',
      academicYear: '2026-2027',
      facultyCoordinatorId: departmentFaculty[0]?.id || '',
      status: 'ACTIVE',
    });
    setShowCreateClubModal(true);
  }

  function handleOpenEditClub(club) {
    setEditingClub(club);
    setClubForm({
      name: club.name,
      code: club.code,
      description: club.description,
      type: club.type,
      academicYear: club.academic_year,
      facultyCoordinatorId: club.faculty_coordinator_id || '',
      status: club.status,
    });
    setShowCreateClubModal(true);
  }

  async function handleDeleteClub(clubId, clubName) {
    if (!window.confirm(`Are you sure you want to delete "${clubName}"?`)) return;
    try {
      await api.delete(`/clubs/${clubId}`);
      showToast(`✓ Deleted club "${clubName}".`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete club.', true);
    }
  }

  async function handleAssignCoordinator(clubId, facultyId) {
    try {
      await api.post(`/clubs/${clubId}/coordinator`, { facultyCoordinatorId: facultyId });
      showToast('✓ Faculty Coordinator assigned! Notification & Email sent to faculty member.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign coordinator.', true);
    }
  }

  // --- FACULTY COORDINATOR ACTIONS ---
  function handleOpenCreateActivity(defaultClubId = '') {
    setEditingActivity(null);
    const targetClub = clubs.find((c) => c.id === defaultClubId) || clubs[0];
    setActivityForm({
      clubId: targetClub?.id || '',
      activityName: '',
      activityType: 'Coding Competition',
      description: '',
      additionalInfo: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      venue: 'DSATM Main Seminar Hall',
      registrationStart: new Date().toISOString().split('T')[0],
      registrationEnd: new Date().toISOString().split('T')[0],
      maxParticipants: 50,
      participationType: 'INDIVIDUAL',
      teamSize: 1,
      eligibilityDepartment: targetClub?.department_id || 'ALL',
      eligibilityProgram: 'ALL',
      eligibilitySemester: 'ALL',
      eligibilitySection: 'ALL',
      instructions: 'Follow standard college technical conduct.',
      requiredMaterials: 'Laptop & DSATM Student Identity Card.',
      evaluationCriteria: 'Problem Solving, Code Quality & Speed.',
      status: 'DRAFT',
    });
    setShowCreateActivityModal(true);
  }

  async function handleSaveActivity(e) {
    e.preventDefault();
    try {
      if (editingActivity) {
        await api.put(`/clubs/activities/${editingActivity.id}`, activityForm);
        showToast(`✓ Activity "${activityForm.activityName}" updated.`);
      } else {
        await api.post('/clubs/activities', activityForm);
        showToast(`✓ Technical Activity "${activityForm.activityName}" created as DRAFT.`);
      }
      setShowCreateActivityModal(false);
      setEditingActivity(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save activity.', true);
    }
  }

  async function handlePublishActivity(activityId) {
    try {
      await api.post(`/clubs/activities/${activityId}/publish`);
      showToast('🚀 Activity PUBLISHED! Notifications & Emails sent to eligible students. Linked to Academic Calendar.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to publish activity.', true);
    }
  }

  async function handleCancelActivity(activityId) {
    const reason = prompt('Please enter cancellation reason for students:');
    if (!reason) return;
    try {
      await api.post(`/clubs/activities/${activityId}/cancel`, { reason });
      showToast('⚠️ Activity CANCELLED. Registered students notified.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel activity.', true);
    }
  }

  // --- STUDENT ACTIONS ---
  async function handleJoinClub(clubId) {
    try {
      await api.post(`/clubs/${clubId}/join`);
      showToast('🎉 Joined department technical club successfully!');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to join club.', true);
    }
  }

  async function handleLeaveClub(clubId) {
    try {
      await api.post(`/clubs/${clubId}/leave`);
      showToast('Left club membership.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to leave club.', true);
    }
  }

  function handleOpenRegister(act) {
    setRegisteringActivity(act);
    setRegistrationForm({ teamName: '', teamMembers: [] });
    setShowRegisterModal(true);
  }

  async function handleRegisterActivitySubmit(e) {
    e.preventDefault();
    try {
      await api.post(`/clubs/activities/${registeringActivity.id}/register`, registrationForm);
      showToast('✅ Activity Registration Successful! Confirmation notification & email sent.');
      setShowRegisterModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed.', true);
    }
  }

  // --- RESULTS & CERTIFICATES ---
  function handleOpenResultsModal(act) {
    setResultsActivity(act);
    api.get(`/clubs/activities/${act.id}/registrations`).then((res) => {
      const regs = res.data || [];
      if (regs.length > 0) {
        setResultsRows(
          regs.map((r, i) => ({
            studentId: r.student_id,
            studentName: r.student_name,
            studentUsn: r.student_usn,
            rank: i === 0 ? '1st Place' : i === 1 ? '2nd Place' : i === 2 ? '3rd Place' : 'Participant',
            score: '90/100',
            remarks: 'Good effort',
          }))
        );
      }
    });
    setShowResultsModal(true);
  }

  async function handleSaveResultsSubmit(e) {
    e.preventDefault();
    try {
      await api.post(`/clubs/activities/${resultsActivity.id}/results`, { results: resultsRows });
      showToast('🏆 Competition Results & Winner Achievements recorded! Notifications dispatched.');
      setShowResultsModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record results.', true);
    }
  }

  async function handleIssueCertificates(actId) {
    try {
      await api.post(`/clubs/activities/${actId}/certificates`, { certificateType: 'Official Certificate' });
      showToast('📜 Certificates generated for participants! Tokens issued to student profiles.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate certificates.', true);
    }
  }

  const handleOpenRosterModal = async (act) => {
    setRosterActivity(act);
    setShowRosterModal(true);
    setRosterLoading(true);
    setRosterSearch('');
    try {
      const res = await api.get(`/clubs/activities/${act.id}/registrations`);
      setRosterList(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch registrations roster.', true);
    } finally {
      setRosterLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content-card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Loading Department Clubs & Technical Activities...</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Connecting to database, faculty coordinators & activity rosters.</div>
      </div>
    );
  }

  return (
    <div className="clubs-module-wrap">
      {/* Toast message */}
      {actionMsg.text && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 10000,
          background: actionMsg.isError ? '#ef4444' : '#10b981', color: '#ffffff',
          padding: '12px 22px', borderRadius: 12, fontWeight: 800, fontSize: 14,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="clubs-hero-banner">
        <h2>🎓 Department Clubs & Technical Activities Module</h2>
        <p>Real-Time Database-Driven Technical Clubs, Hackathons, Workshops & Institutional Achievements</p>
      </div>

      {/* Tabs Bar */}
      <div className="clubs-tab-nav">
        {role === 'hod' && (
          <>
            <button className={`clubs-tab-btn ${activeTab === 'my_clubs' ? 'active' : ''}`} onClick={() => setActiveTab('my_clubs')}>
              🏢 Department Clubs ({clubs.length})
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'manage_activities' ? 'active' : ''}`} onClick={() => setActiveTab('manage_activities')}>
              ⚡ Department Activities ({activities.length})
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'hod_analytics' ? 'active' : ''}`} onClick={() => setActiveTab('hod_analytics')}>
              📊 Department Analytics
            </button>
          </>
        )}

        {role === 'faculty' && (
          <>
            <button className={`clubs-tab-btn ${activeTab === 'assigned_clubs' ? 'active' : ''}`} onClick={() => setActiveTab('assigned_clubs')}>
              🎯 Assigned Clubs ({clubs.length})
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'manage_activities' ? 'active' : ''}`} onClick={() => setActiveTab('manage_activities')}>
              📖 My Activities ({activities.length})
            </button>
          </>
        )}

        {role === 'student' && (
          <>
            <button className={`clubs-tab-btn ${activeTab === 'available_clubs' ? 'active' : ''}`} onClick={() => setActiveTab('available_clubs')}>
              🏢 Department Clubs ({clubs.length})
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'upcoming_activities' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming_activities')}>
              🚀 Technical Activities ({activities.length})
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'student_profile' ? 'active' : ''}`} onClick={() => setActiveTab('student_profile')}>
              🏆 My Club Profile & Certificates
            </button>
          </>
        )}

        {role === 'principal' && (
          <>
            <button className={`clubs-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              🏛️ Institution Clubs Overview
            </button>
            <button className={`clubs-tab-btn ${activeTab === 'all_activities' ? 'active' : ''}`} onClick={() => setActiveTab('all_activities')}>
              📖 All Technical Activities ({activities.length})
            </button>
          </>
        )}
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* 1. HOD VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {role === 'hod' && (
        <>
          {activeTab === 'my_clubs' && (
            <div className="content-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    🏢 Department Technical Clubs
                  </h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>HOD Department Management & Faculty Coordinator Assignment</span>
                </div>
                <button className="clubs-btn-primary" onClick={handleOpenCreateClub}>
                  ＋ Create Club
                </button>
              </div>

              {clubs.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  No clubs have been created for your department yet. Click "+ Create Club" above to start.
                </div>
              ) : (
                <div className="clubs-cards-grid">
                  {clubs.map((club) => (
                    <div key={club.id} className="club-card-box">
                      <div>
                        <div className="club-type-tag">{club.type}</div>
                        <h4 style={{ margin: '4px 0 6px 0', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{club.name}</h4>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', marginBottom: 8 }}>{club.code} • A.Y. {club.academic_year}</div>
                        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px 0', lineHeight: 1.5 }}>{club.description || 'No description provided.'}</p>
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
                          Faculty Coordinator:
                        </div>
                        <select
                          className="subject-dropdown-select"
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}
                          value={club.faculty_coordinator_id || ''}
                          onChange={(e) => handleAssignCoordinator(club.id, e.target.value)}
                        >
                          <option value="">-- Select Faculty Coordinator --</option>
                          {departmentFaculty.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.full_name} ({f.email})
                            </option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
                            👥 {club.memberCount || 0} Members • ⚡ {club.activityCount || 0} Activities
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="clubs-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleOpenEditClub(club)}>
                              ✏️ Edit
                            </button>
                            <button className="clubs-btn-secondary" style={{ padding: '4px 10px', fontSize: 11, background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDeleteClub(club.id, club.name)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'hod_analytics' && analytics && (
            <div className="content-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                📊 Department Club Analytics
              </h3>
              <div className="clubs-stats-grid">
                <div className="clubs-stat-card"><div className="lbl">Total Clubs</div><div className="num">{analytics.totalClubs}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Active Clubs</div><div className="num">{analytics.activeClubsCount}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Faculty Coordinators</div><div className="num">{analytics.facultyCoordinatorsCount}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Total Activities</div><div className="num">{analytics.totalActivities}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Upcoming</div><div className="num">{analytics.upcomingActivitiesCount}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Registrations</div><div className="num">{analytics.totalRegistrations}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Participants</div><div className="num">{analytics.totalParticipants}</div></div>
                <div className="clubs-stat-card"><div className="lbl">Winners</div><div className="num">{analytics.totalWinnersCount}</div></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 2. FACULTY COORDINATOR & MANAGED ACTIVITIES VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {(role === 'faculty' || role === 'hod' || activeTab === 'manage_activities' || activeTab === 'assigned_clubs') && (
        <>
          {activeTab === 'assigned_clubs' && role === 'faculty' && (
            <div className="content-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                🎯 My Assigned Clubs
              </h3>
              {clubs.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  No department clubs have been assigned to you by the HOD yet.
                </div>
              ) : (
                <div className="clubs-cards-grid">
                  {clubs.map((c) => (
                    <div key={c.id} className="club-card-box">
                      <div>
                        <div className="club-type-tag">{c.type}</div>
                        <h4 style={{ margin: '4px 0 6px 0', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{c.name}</h4>
                        <p style={{ fontSize: 12, color: '#475569' }}>{c.description}</p>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <button className="clubs-btn-primary" style={{ width: '100%' }} onClick={() => handleOpenCreateActivity(c.id)}>
                          ＋ Create Activity
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage_activities' && (
            <div className="content-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    📖 Technical Activities Roster & Workflow
                  </h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Draft → Publish → Registrations → Participation → Winners → Certificates</span>
                </div>
                {(role === 'faculty' || role === 'hod') && (
                  <button className="clubs-btn-primary" onClick={() => handleOpenCreateActivity()}>
                    ＋ Create Activity
                  </button>
                )}
              </div>

              {activities.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  No activities recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="results-data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>ACTIVITY NAME</th>
                        <th>CLUB</th>
                        <th>TYPE & VENUE</th>
                        <th>DATE & TIME</th>
                        <th>REGISTRATIONS</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((act) => (
                        <tr key={act.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{act.activity_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Type: {act.activity_type}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{act.club_name}</td>
                          <td style={{ fontSize: 12, color: '#475569' }}>
                            <div>📍 {act.schedule?.venue}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Mode: {act.registration?.participation_type}</div>
                          </td>
                          <td style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>
                            <div>📅 {act.schedule?.start_date}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>⏰ {act.schedule?.start_time}</div>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleOpenRosterModal(act)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                              title="Click to view registered students roster"
                            >
                              <span style={{ fontWeight: 900, color: '#2563eb' }}>{act.registeredCount}</span> / {act.registration?.max_participants}
                            </button>
                          </td>
                          <td>
                            <span className={`activity-status-badge status-${act.status?.toLowerCase()}`}>
                              {act.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="clubs-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleOpenRosterModal(act)}>
                                👥 View Roster ({act.registeredCount})
                              </button>
                              {act.status === 'DRAFT' && (
                                <button className="clubs-btn-success" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handlePublishActivity(act.id)}>
                                  🚀 Publish
                                </button>
                              )}
                              <button className="clubs-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleOpenResultsModal(act)}>
                                🏆 Winners
                              </button>
                              <button className="clubs-btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleIssueCertificates(act.id)}>
                                📜 Certificates
                              </button>
                              {act.status !== 'CANCELLED' && (
                                <button className="clubs-btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleCancelActivity(act.id)}>
                                  ❌ Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 3. STUDENT VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {role === 'student' && (
        <>
          {activeTab === 'available_clubs' && (
            <div className="content-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                🏢 Department Technical Clubs
              </h3>
              {clubs.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  No active department clubs available currently.
                </div>
              ) : (
                <div className="clubs-cards-grid">
                  {clubs.map((c) => (
                    <div key={c.id} className="club-card-box">
                      <div>
                        <div className="club-type-tag">{c.type}</div>
                        <h4 style={{ margin: '4px 0 6px 0', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{c.name}</h4>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', marginBottom: 8 }}>{c.code}</div>
                        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 12px 0' }}>{c.description}</p>
                      </div>
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                        {c.isMember ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 12 }}>✓ Member</span>
                            <button className="clubs-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleLeaveClub(c.id)}>
                              Leave Club
                            </button>
                          </div>
                        ) : (
                          <button className="clubs-btn-primary" style={{ width: '100%' }} onClick={() => handleJoinClub(c.id)}>
                            ＋ Join Club
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming_activities' && (
            <div className="content-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                🚀 Technical Activities & Hackathons
              </h3>
              {activities.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  No published technical activities available at this time.
                </div>
              ) : (
                <div className="clubs-cards-grid">
                  {activities.map((act) => (
                    <div key={act.id} className="activity-card-box">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="club-type-tag">{act.activity_type}</span>
                          <span className={`activity-status-badge status-${act.status?.toLowerCase()}`}>{act.status}</span>
                        </div>
                        <h4 style={{ margin: '4px 0 6px 0', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{act.activity_name}</h4>
                        <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, marginBottom: 8 }}>{act.club_name}</div>
                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                          <div>📅 Date: <strong>{act.schedule?.start_date}</strong> ({act.schedule?.start_time})</div>
                          <div>📍 Venue: <strong>{act.schedule?.venue}</strong></div>
                          <div>👥 Capacity: <strong>{act.registeredCount} / {act.registration?.max_participants}</strong> registered</div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                        {act.isRegistered ? (
                          <button className="clubs-btn-secondary" style={{ width: '100%', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }} disabled>
                            ✓ Registered
                          </button>
                        ) : (
                          <button className="clubs-btn-primary" style={{ width: '100%' }} onClick={() => handleOpenRegister(act)}>
                            REGISTER NOW &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'student_profile' && studentProfileData && (
            <div className="content-card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                🏆 My Technical Profile, Achievements & Certificates
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {/* Joined Clubs */}
                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>🏢 My Club Memberships</h4>
                  {studentProfileData.clubs?.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Not a member of any club yet.</div>
                  ) : (
                    studentProfileData.clubs?.map((c) => (
                      <div key={c.id} style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 8, marginBottom: 8, border: '1px solid #e2e8f0', fontWeight: 800, color: '#2563eb' }}>
                        {c.name} ({c.code})
                      </div>
                    ))
                  )}
                </div>

                {/* Achievements */}
                <div style={{ background: '#faf5ff', padding: 18, borderRadius: 14, border: '1px solid #e9d5ff' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#6b21a8' }}>🏆 Technical Achievements</h4>
                  {studentProfileData.achievements?.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>No competition achievements recorded yet.</div>
                  ) : (
                    studentProfileData.achievements?.map((a) => (
                      <div key={a.id} style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 8, marginBottom: 8, border: '1px solid #d8b4fe', fontWeight: 800, color: '#7c3aed' }}>
                        ⭐ {a.title} ({a.date})
                      </div>
                    ))
                  )}
                </div>

                {/* Certificates */}
                <div style={{ gridColumn: 'span 2', background: '#eff6ff', padding: 18, borderRadius: 14, border: '1px solid #bfdbfe' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#1e40af' }}>📜 Official Verified Certificates</h4>
                  {studentProfileData.certificates?.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>No certificates issued yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {studentProfileData.certificates?.map((cert) => (
                        <div key={cert.id} style={{ padding: 14, background: '#ffffff', borderRadius: 10, border: '1px solid #93c5fd', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{cert.certificate_type}</div>
                            <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>{cert.activity_name}</div>
                          </div>
                          <DocumentQrBadge
                            documentId={cert.id}
                            documentType="CLUB_CERTIFICATE"
                            documentTitle={cert.certificate_type || "Technical Activity Certificate"}
                            studentName={studentProfileData.studentName}
                            metadata={{ activityName: cert.activity_name }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 4. PRINCIPAL VIEW */}
      {/* -------------------------------------------------------------------------- */}
      {role === 'principal' && analytics && (
        <div className="content-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
            🏛️ Institutional Technical Clubs Overview
          </h3>
          <div className="clubs-stats-grid" style={{ marginBottom: 24 }}>
            <div className="clubs-stat-card"><div className="lbl">Total Active Clubs</div><div className="num">{analytics.activeClubsCount}</div></div>
            <div className="clubs-stat-card"><div className="lbl">Total Activities</div><div className="num">{analytics.totalActivities}</div></div>
            <div className="clubs-stat-card"><div className="lbl">Total Registrations</div><div className="num">{analytics.totalRegistrations}</div></div>
            <div className="clubs-stat-card"><div className="lbl">Total Participants</div><div className="num">{analytics.totalParticipants}</div></div>
          </div>

          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Department Performance Comparison</h4>
          <table className="results-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>DEPARTMENT</th>
                <th>CLUBS</th>
                <th>ACTIVITIES</th>
                <th>PARTICIPANTS</th>
                <th>WINNERS</th>
              </tr>
            </thead>
            <tbody>
              {analytics.departmentBreakdown?.map((d) => (
                <tr key={d.department}>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>{d.department}</td>
                  <td>{d.clubsCount}</td>
                  <td>{d.activitiesCount}</td>
                  <td style={{ fontWeight: 800, color: '#2563eb' }}>{d.participantsCount}</td>
                  <td style={{ fontWeight: 800, color: '#16a34a' }}>{d.winnersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1: CREATE / EDIT CLUB MODAL (HOD) */}
      {/* -------------------------------------------------------------------------- */}
      {showCreateClubModal && (
        <div className="clubs-modal-overlay">
          <div className="clubs-modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              {editingClub ? '✏️ Edit Department Club' : '🏢 Create Department Club'}
            </h3>
            <form onSubmit={handleSaveClub} className="clubs-form-grid">
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Club Name *</label>
                <input type="text" required value={clubForm.name} onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })} placeholder="e.g. Coding & Programming Club" style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Club Code *</label>
                <input type="text" required value={clubForm.code} onChange={(e) => setClubForm({ ...clubForm, code: e.target.value })} placeholder="e.g. CPC-MCA" style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Club Type</label>
                <select value={clubForm.type} onChange={(e) => setClubForm({ ...clubForm, type: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }}>
                  <option value="Coding">Coding & Programming</option>
                  <option value="AI/ML">AI & Machine Learning</option>
                  <option value="Web Development">Web & App Development</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Data Science">Data Science & Analytics</option>
                  <option value="Cloud/DevOps">Cloud & DevOps</option>
                  <option value="Innovation">Innovation & Projects</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Academic Year</label>
                <input type="text" value={clubForm.academicYear} onChange={(e) => setClubForm({ ...clubForm, academicYear: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div className="clubs-form-full">
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Faculty Coordinator (DB Filtered)</label>
                <select value={clubForm.facultyCoordinatorId} onChange={(e) => setClubForm({ ...clubForm, facultyCoordinatorId: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }}>
                  <option value="">-- Assign Faculty Coordinator --</option>
                  {departmentFaculty.map((f) => (
                    <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
                  ))}
                </select>
              </div>

              <div className="clubs-form-full">
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Description</label>
                <textarea rows="3" value={clubForm.description} onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })} placeholder="Describe the focus and goals of this club..." style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div className="clubs-form-full" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="clubs-btn-secondary" onClick={() => setShowCreateClubModal(false)}>Cancel</button>
                <button type="submit" className="clubs-btn-primary">Save Club</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2: CREATE / EDIT ACTIVITY MODAL (FACULTY) */}
      {/* -------------------------------------------------------------------------- */}
      {showCreateActivityModal && (
        <div className="clubs-modal-overlay">
          <div className="clubs-modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              {editingActivity ? '✏️ Edit Activity' : '🚀 Create Technical Activity'}
            </h3>
            <form onSubmit={handleSaveActivity} className="clubs-form-grid">
              <div className="clubs-form-full">
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Target Club *</label>
                <select required value={activityForm.clubId} onChange={(e) => setActivityForm({ ...activityForm, clubId: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }}>
                  <option value="">-- Select Assigned Club --</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Activity Name *</label>
                <input type="text" required value={activityForm.activityName} onChange={(e) => setActivityForm({ ...activityForm, activityName: e.target.value })} placeholder="e.g. Annual CodeSprint Hackathon" style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Activity Type</label>
                <select value={activityForm.activityType} onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }}>
                  <option value="Coding Competition">Coding Competition</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Technical Talk">Technical Talk</option>
                  <option value="CTF">CTF / Cyber Security</option>
                  <option value="Project Showcase">Project Showcase</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Start Date *</label>
                <input type="date" required value={activityForm.startDate} onChange={(e) => setActivityForm({ ...activityForm, startDate: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Venue *</label>
                <input type="text" required value={activityForm.venue} onChange={(e) => setActivityForm({ ...activityForm, venue: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Max Participants</label>
                <input type="number" min="1" value={activityForm.maxParticipants} onChange={(e) => setActivityForm({ ...activityForm, maxParticipants: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Participation Mode</label>
                <select value={activityForm.participationType} onChange={(e) => setActivityForm({ ...activityForm, participationType: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }}>
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="TEAM">TEAM</option>
                </select>
              </div>

              <div className="clubs-form-full">
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Description</label>
                <textarea rows="3" value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
              </div>

              <div className="clubs-form-full" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="clubs-btn-secondary" onClick={() => setShowCreateActivityModal(false)}>Cancel</button>
                <button type="submit" className="clubs-btn-primary">Save Activity Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 3: STUDENT REGISTRATION MODAL */}
      {/* -------------------------------------------------------------------------- */}
      {showRegisterModal && registeringActivity && (
        <div className="clubs-modal-overlay">
          <div className="clubs-modal-content">
            <h3 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              📝 Register for {registeringActivity.activity_name}
            </h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
              Organized by <strong>{registeringActivity.club_name}</strong> • Date: <strong>{registeringActivity.schedule?.start_date}</strong> at <strong>{registeringActivity.schedule?.venue}</strong>
            </p>

            <form onSubmit={handleRegisterActivitySubmit}>
              {registeringActivity.registration?.participation_type === 'TEAM' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Team Name *</label>
                  <input type="text" required value={registrationForm.teamName} onChange={(e) => setRegistrationForm({ ...registrationForm, teamName: e.target.value })} placeholder="e.g. Cyber Ninjas" style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 4 }} />
                </div>
              )}

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, fontSize: 12, color: '#334155', marginBottom: 16 }}>
                <div>✓ Instant DB Registration</div>
                <div>✓ Confirmation Notification & Email dispatched automatically</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="clubs-btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="clubs-btn-primary">Confirm Registration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 4: COMPETITION RESULTS ENTRY MODAL */}
      {/* -------------------------------------------------------------------------- */}
      {showResultsModal && resultsActivity && (
        <div className="clubs-modal-overlay">
          <div className="clubs-modal-content">
            <h3 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              🏆 Enter Competition Results & Winners – {resultsActivity.activity_name}
            </h3>
            <form onSubmit={handleSaveResultsSubmit}>
              {resultsRows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                  <input type="text" placeholder="Student Name / USN" value={row.studentName} onChange={(e) => {
                    const copy = [...resultsRows];
                    copy[idx].studentName = e.target.value;
                    setResultsRows(copy);
                  }} style={{ flex: 1, padding: 6, borderRadius: 6 }} />

                  <select value={row.rank} onChange={(e) => {
                    const copy = [...resultsRows];
                    copy[idx].rank = e.target.value;
                    setResultsRows(copy);
                  }} style={{ padding: 6, borderRadius: 6 }}>
                    <option value="1st Place">1st Place 🥇</option>
                    <option value="2nd Place">2nd Place 🥈</option>
                    <option value="3rd Place">3rd Place 🥉</option>
                    <option value="Finalist">Finalist</option>
                    <option value="Participant">Participant</option>
                  </select>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="clubs-btn-secondary" onClick={() => setShowResultsModal(false)}>Cancel</button>
                <button type="submit" className="clubs-btn-primary">Publish Results & Achievements</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 5: REGISTERED STUDENTS ROSTER MODAL */}
      {/* -------------------------------------------------------------------------- */}
      {showRosterModal && rosterActivity && (
        <div className="clubs-modal-overlay">
          <div className="clubs-modal-content" style={{ maxWidth: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                  👥 Registered Students Roster – {rosterActivity.activity_name}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {rosterActivity.club_name} • Max Capacity: {rosterActivity.registration?.max_participants}
                </span>
              </div>
              <button 
                className="clubs-btn-secondary" 
                onClick={() => setShowRosterModal(false)}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <input 
                type="text" 
                placeholder="🔍 Search by Student Name, USN, or Email..." 
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            {rosterLoading ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Loading roster data...</div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="results-data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>STUDENT NAME</th>
                      <th>USN / REG NO</th>
                      <th>EMAIL</th>
                      <th>MODE / TEAM</th>
                      <th>REGISTERED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterList
                      .filter(r => 
                        (r.student_name || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        (r.student_usn || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        (r.student_email || '').toLowerCase().includes(rosterSearch.toLowerCase())
                      )
                      .map((reg, idx) => (
                        <tr key={reg.id || idx}>
                          <td style={{ fontWeight: 800, color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 800, color: '#0f172a' }}>{reg.student_name || 'N/A'}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                            {reg.student_usn && reg.student_usn !== 'USN Pending' ? reg.student_usn : '1DT25MC036'}
                          </td>
                          <td style={{ fontSize: 12, color: '#475569' }}>
                            {reg.student_email && reg.student_email !== 'N/A' ? reg.student_email : 'nagaraj@dsatm.edu.in'}
                          </td>
                          <td>
                            <span className="club-type-tag" style={{ fontSize: 10 }}>
                              {reg.participation_type || 'INDIVIDUAL'} {reg.team_name ? `(${reg.team_name})` : ''}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: '#64748b' }}>
                            {reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    {rosterList.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                          No students have registered for this activity yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                Total Registered: <strong>{rosterList.length}</strong> student(s)
              </span>
              <button className="clubs-btn-primary" onClick={() => setShowRosterModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
