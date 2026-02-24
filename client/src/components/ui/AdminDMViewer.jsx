import { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function AdminDMViewer({ onClose }) {
  const [users, setUsers] = useState([]);
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/users').then(({ data }) => setUsers(data));
  }, []);

  const loadDMs = async () => {
    if (!user1 || !user2 || user1 === user2) return setError('Select two different users');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/dms/${user1}/${user2}`);
      setMessages(data);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#111', border: '1px solid #2a2a2a', borderRadius: 12,
        width: '90%', maxWidth: 600, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #2a2a2a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#e8e8e8' }}>🔍 Admin DM Viewer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid #2a2a2a', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>User 1</p>
            <select
              value={user1}
              onChange={e => setUser1(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e8e8e8', fontSize: 13 }}
            >
              <option value=''>Select user...</option>
              {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>User 2</p>
            <select
              value={user2}
              onChange={e => setUser2(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e8e8e8', fontSize: 13 }}
            >
              <option value=''>Select user...</option>
              {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
            </select>
          </div>
          <button
            onClick={loadDMs}
            className="btn-primary"
            style={{ padding: '7px 16px', whiteSpace: 'nowrap' }}
          >
            View DMs
          </button>
        </div>

        {error && <p style={{ color: '#f23f43', fontSize: 13, padding: '8px 16px', margin: 0 }}>{error}</p>}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Loading...</p>}
          {!loading && messages.length === 0 && user1 && user2 && (
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>No messages found.</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt={msg.username} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>
                  {msg.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8' }}>{msg.username}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>{formatTime(msg.created_at)}</span>
                </div>
                {msg.content.startsWith('[img]') ? (
                  <img src={msg.content.slice(5, -6)} alt="img" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 6, marginTop: 4 }} />
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#ccc' }}>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}