import React, { useState } from 'react'
import api from '../../api/client.js'

export default function PrincipalMessages({ staffDirectory, invites, loadInvites, departments }) {
  const [msgAudience, setMsgAudience] = useState('hods')
  const [msgRecipient, setMsgRecipient] = useState('')
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgStatus, setMsgStatus] = useState({ text: '', error: false })

  const [inviteRole, setInviteRole] = useState('faculty')
  const [inviteDept, setInviteDept] = useState('')
  const [inviteStatus, setInviteStatus] = useState({ text: '', error: false })

  async function handleSendMessage(e) {
    e.preventDefault()
    setMsgStatus({ text: 'Sending...', error: false })
    try {
      const { data } = await api.post('/principal/broadcast', {
        audience: msgAudience,
        recipientId: msgAudience === 'individual' ? msgRecipient : undefined,
        subject: msgSubject,
        body: msgBody,
      })
      setMsgStatus({ text: `✅ Message broadcasted to ${data.recipient_count || 1} recipient(s).`, error: false })
      setMsgSubject('')
      setMsgBody('')
    } catch (err) {
      setMsgStatus({ text: err.response?.data?.error || 'Failed to send message', error: true })
    }
  }

  async function handleGenerateInvite(e) {
    e.preventDefault()
    setInviteStatus({ text: 'Generating code...', error: false })
    try {
      const { data } = await api.post('/invites', {
        role: inviteRole,
        departmentId: inviteRole !== 'principal' ? inviteDept || undefined : undefined,
      })
      setInviteStatus({ text: `✅ New staff invite code generated: ${data.code}`, error: false })
      if (loadInvites) loadInvites()
    } catch (err) {
      setInviteStatus({ text: err.response?.data?.error || 'Failed to generate invite code', error: true })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Broadcast Message Panel */}
      <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
        <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>✉️ Broadcast Administrative Alert / Message</h2>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Reaches recipients directly in their top notification bell and inbox.
        </p>

        {msgStatus.text && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: msgStatus.error ? '#fef2f2' : '#ecfdf5', color: msgStatus.error ? '#b91c1c' : '#047857', border: msgStatus.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
            {msgStatus.text}
          </div>
        )}

        <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={msgAudience} onChange={(e) => setMsgAudience(e.target.value)} style={{ flex: 1, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="hods">All Heads of Department (HODs)</option>
              <option value="all_staff">All Academic Staff (Faculty + HODs)</option>
              <option value="individual">Specific Person</option>
            </select>

            {msgAudience === 'individual' && (
              <select value={msgRecipient} onChange={(e) => setMsgRecipient(e.target.value)} required style={{ flex: 1, background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
                <option value="">Select recipient</option>
                {staffDirectory.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                ))}
              </select>
            )}
          </div>

          <input
            type="text"
            value={msgSubject}
            onChange={(e) => setMsgSubject(e.target.value)}
            placeholder="Subject (e.g. Academic Council Meeting tomorrow at 10 AM)"
            style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
            required
          />

          <textarea
            rows={4}
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            placeholder="Type your message body..."
            style={{ fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155' }}
          />

          <button type="submit" className="fd-btn" style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', border: '1.5px solid #1e293b', fontWeight: 800 }}>
            Send Broadcast Alert →
          </button>
        </form>
      </div>

      {/* Staff Onboarding Invite Codes */}
      <div className="pd-panel glass-card" style={{ padding: 24, border: '1.5px solid #1e293b', background: '#ffffff' }}>
        <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: '#0f172a', fontWeight: 800 }}>🎫 Staff Onboarding Invite Codes</h2>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px 0', fontWeight: 600 }}>
          Generate secure registration invite codes for new Faculty, HOD, or Principal staff.
        </p>

        {inviteStatus.text && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: inviteStatus.error ? '#fef2f2' : '#ecfdf5', color: inviteStatus.error ? '#b91c1c' : '#047857', border: inviteStatus.error ? '1.5px solid #dc2626' : '1.5px solid #059669', fontWeight: 800 }}>
            {inviteStatus.text}
          </div>
        )}

        <form onSubmit={handleGenerateInvite} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
            <option value="faculty">Faculty</option>
            <option value="hod">HOD</option>
            <option value="principal">Principal</option>
          </select>

          {inviteRole !== 'principal' && (
            <select value={inviteDept} onChange={(e) => setInviteDept(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1.5px solid #334155', fontWeight: 700 }}>
              <option value="">Select Department</option>
              {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <button type="submit" className="fd-btn" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', border: '1.5px solid #1e293b', fontWeight: 800 }}>Generate Invite Code</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(invites || []).map((inv) => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #334155' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1d4ed8' }}>{inv.code}</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 700, color: '#0f172a' }}>{inv.role}</span>
              <span style={{ color: inv.used ? '#dc2626' : '#047857', fontWeight: 800 }}>{inv.used ? 'Used' : 'Unused'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
