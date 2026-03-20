import { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function AdminDMViewer({ onClose }) {
  const [tab, setTab] = useState('dms');
  const [users, setUsers] = useState([]);
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [ipUsers, setIpUsers] = useState([]);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipSearch, setIpSearch] = useState('');

  useEffect(() => {
    api.get('/api/admin/users').then(({ data }) => setUsers(data));
  }, []);

  useEffect(() => {
    if (tab === 'reports') {
      setReportsLoading(true);
      api.get('/api/admin/reports').then(({ data }) => { setReports(data); setReportsLoading(false); }).catch(() => setReportsLoading(false));
    }
    if (tab === 'ips') {
      setIpLoading(true);
      api.get('/api/admin/ips').then(({ data }) => { setIpUsers(data); setIpLoading(false); }).catch(() => setIpLoading(false));
    }
  }, [tab]);

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

  const resolveReport = async (id) => {
    try {
      await api.patch(`/api/admin/reports/${id}/resolve`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const formatTime = (ts) => ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

  const formatUA = (ua) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const filteredIpUsers = ipUsers.filter(u =>
    u.username.toLowerCase().includes(ipSearch.toLowerCase()) ||
    (u.ip_address || '').includes(ipSearch)
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '90%', maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#e8e8e8' }}>🔍 Admin Panel</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          {[
            { id: 'dms', label: '💬 DM Viewer' },
            { id: 'reports', label: `⚠️ Reports${reports.length > 0 ? ` (${reports.length})` : ''}` },
            { id: 'ips', label: '🌐 IP Lookup' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px', background: tab === t.id ? '#1a1a1a' : 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #5865f2' : '2px solid transparent', color: tab === t.id ? '#e8e8e8' : '#888', fontSize: 12, cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* DM Viewer Tab */}
        {tab === 'dms' && (
          <>
            <div style={{ padding: 16, borderBottom: '1px solid #2a2a2a', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>User 1</p>
                <select value={user1} onChange={e => setUser1(e.target.value)} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e8e8e8', fontSize: 13 }}>
                  <option value=''>Select user...</option>
                  {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>User 2</p>
                <select value={user2} onChange={e => setUser2(e.target.value)} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e8e8e8', fontSize: 13 }}>
                  <option value=''>Select user...</option>
                  {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                </select>
              </div>
              <button onClick={loadDMs} className="btn-primary" style={{ padding: '7px 16px', whiteSpace: 'nowrap' }}>View DMs</button>
            </div>
            {error && <p style={{ color: '#f23f43', fontSize: 13, padding: '8px 16px', margin: 0 }}>{error}</p>}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Loading...</p>}
              {!loading && messages.length === 0 && user1 && user2 && <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>No messages found.</p>}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {msg.avatar_url ? <img src={msg.avatar_url} alt={msg.username} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>{msg.username[0].toUpperCase()}</div>}
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8' }}>{msg.username}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{formatTime(msg.created_at)}</span>
                    </div>
                    {msg.content.startsWith('[img]') ? <img src={msg.content.slice(5, -6)} alt="img" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 6, marginTop: 4 }} /> : <p style={{ margin: '2px 0 0', fontSize: 13, color: '#ccc' }}>{msg.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reportsLoading && <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Loading...</p>}
            {!reportsLoading && reports.length === 0 && <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 20 }}>No pending reports 🎉</p>}
            {reports.map(r => (
              <div key={r.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 600 }}>⚠️ {r.reported_username}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>reported by {r.reporter_username}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#555' }}>{formatTime(r.created_at)}</span>
                </div>
                {r.message_content && (
                  <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 12, color: '#aaa' }}>
                    <span style={{ color: '#666', fontSize: 11 }}>Message: </span>
                    {r.message_content.startsWith('[img]') ? '🖼️ Image' : r.message_content.slice(0, 200)}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Reason: {r.reason}</span>
                  <button onClick={() => resolveReport(r.id)} style={{ background: '#23a55a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✓ Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* IP Lookup Tab */}
        {tab === 'ips' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
              <input value={ipSearch} onChange={e => setIpSearch(e.target.value)} placeholder="Search by username or IP..." style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#e8e8e8', fontSize: 13 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {ipLoading && <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>}
              {!ipLoading && filteredIpUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  {u.avatar_url ? <img src={u.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={u.username} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>{u.username[0].toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: u.banned ? '#f23f43' : '#e8e8e8' }}>{u.username}</span>
                      {u.banned && <span style={{ fontSize: 10, background: 'rgba(237,66,69,0.15)', color: '#f23f43', borderRadius: 4, padding: '1px 5px' }}>banned</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: u.ip_address ? '#5865f2' : '#555', fontFamily: 'monospace', fontWeight: 500 }}>{u.ip_address || 'No IP recorded'}</div>
                    <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{u.ip_address ? `${formatUA(u.user_agent)} • ${formatTime(u.last_seen)}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}