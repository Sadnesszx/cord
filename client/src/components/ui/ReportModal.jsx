import { useState } from 'react';
import api from '../../lib/api';

export default function ReportModal({ reportedUser, message, onClose }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/api/friends/report', {
        reportedUserId: reportedUser.id,
        messageId: message?.id || null,
        messageContent: message?.content || null,
        reason: reason.trim() || 'No reason provided',
      });
      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 400, padding: 24, boxShadow: 'var(--shadow-lg)' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: 'var(--white)', fontSize: 16, marginBottom: 8 }}>Report submitted</h3>
            <p style={{ color: 'var(--gray-3)', fontSize: 13, marginBottom: 20 }}>Thank you. The admin will review your report.</p>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--white)', fontSize: 15, fontWeight: 700 }}>Report {reportedUser.username}</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {message && (
              <div style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: 'var(--gray-3)' }}>
                <span style={{ color: 'var(--gray-2)', fontSize: 11, display: 'block', marginBottom: 2 }}>Reported message:</span>
                {message.content?.startsWith('[img]') ? '🖼️ Image' : message.content?.slice(0, 100)}
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe why you're reporting this user..."
                rows={4}
                maxLength={500}
                style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 8, padding: '10px 12px', color: 'var(--white)', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={sending} style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {sending ? 'Sending...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}