import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import './ProfileModal.css';
import AdminDMViewer from './AdminDMViewer';
import ReportModal from './ReportModal';

const getStatusColor = (status) => {
  switch (status) {
    case 'dnd': return '#c0393b';
    case 'idle': return '#c89028';
    case 'invisible': return '#444449';
    case 'offline': return '#444449';
    default: return '#2d8a52';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'dnd': return 'Do Not Disturb';
    case 'idle': return 'Idle';
    case 'invisible': return 'Invisible';
    default: return 'Online';
  }
};

export default function ProfileModal({ username, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [friendStatus, setFriendStatus] = useState('none');
  const [friendMsg, setFriendMsg] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [badges, setBadges] = useState([]);
  const isAdmin = user?.is_admin;
  const isOwnProfile = user?.username === username;
  const [showDMViewer, setShowDMViewer] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [banReason, setBanReason] = useState('');

  const warnUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/warn', { username, warning: warningText });
      setResetMsg('Warning sent!');
      setWarningText('');
      setTimeout(() => setResetMsg(''), 3000);
    } catch { setResetMsg('Error'); }
  };

  const banUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/ban', { username, reason: banReason });
      setResetMsg(`${username} banned!`);
      setBanReason('');
      setTimeout(() => setResetMsg(''), 3000);
    } catch { setResetMsg('Error'); }
  };

  const unbanUser = async () => {
    try {
      await api.post('/api/admin/unban', { username });
      setResetMsg(`${username} unbanned!`);
      setTimeout(() => setResetMsg(''), 3000);
    } catch { setResetMsg('Error'); }
  };

  useEffect(() => {
    api.get(`/api/users/${username}`).then(({ data }) => {
      setProfile(data);
      setLoading(false);
      if (!isOwnProfile && data?.id) {
        api.get(`/api/friends/block/${data.id}`).then(({ data: b }) => setIsBlocked(b.blocked)).catch(() => {});
      }
    }).catch(() => setLoading(false));

    api.get(`/api/scores/badges/${username}`).then(({ data }) => setBadges(data)).catch(() => {});

    if (!isOwnProfile) {
      api.get('/api/friends').then(({ data }) => {
        if (data.find(f => f.username === username)) setFriendStatus('friend');
      });
    }

    const socket = getSocket();
    socket.emit('get_online_users');
    socket.on('online_users', (users) => setOnlineUsers(users));
    return () => socket.off('online_users');
  }, [username]);

  const joined = profile ? new Date(profile.created_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const isOnline = profile ? onlineUsers.map(id => String(id)).includes(String(profile.id)) : false;
  const statusColor = getStatusColor(isOnline ? profile?.status : 'offline');

  const addFriend = async () => {
    try {
      await api.post('/api/friends/request', { username });
      setFriendStatus('pending');
      setFriendMsg('Request sent!');
      setTimeout(() => setFriendMsg(''), 3000);
    } catch (err) {
      setFriendMsg(err.response?.data?.error || 'Error');
      setTimeout(() => setFriendMsg(''), 3000);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/reset-password', { username, newPassword });
      setResetMsg('Password reset!');
      setNewPassword('');
      setTimeout(() => setResetMsg(''), 3000);
    } catch (err) { setResetMsg(err.response?.data?.error || 'Error'); }
  };

  const toggleBlock = async () => {
    if (!profile) return;
    try {
      if (isBlocked) { await api.delete(`/api/friends/block/${profile.id}`); setIsBlocked(false); }
      else { await api.post(`/api/friends/block/${profile.id}`); setIsBlocked(true); }
    } catch (err) { console.error(err); }
  };

  const bannerBg = profile?.profile_border === 'rainbow'
    ? 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff)'
    : (profile?.banner_color || profile?.avatar_color || 'var(--bg-float)');

  const avatarBorder = profile?.profile_border && profile?.profile_border !== 'rainbow'
    ? `3px solid ${profile.profile_border}`
    : profile?.profile_border === 'rainbow'
    ? '3px solid transparent'
    : '3px solid var(--bg-raised)';

  const avatarBackground = profile?.profile_border === 'rainbow'
    ? 'linear-gradient(var(--bg-raised), var(--bg-raised)) padding-box, linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff) border-box'
    : undefined;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>

        {loading && <p className="profile-loading">Loading...</p>}

        {!loading && profile && (
          <>
            {/* Banner */}
            <div style={{ height: 72, background: bannerBg, flexShrink: 0 }} />

            {/* Avatar row */}
            <div style={{ position: 'relative', padding: '0 14px', height: 0 }}>
              <div style={{
                position: 'absolute',
                top: -36,
                left: 14,
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-sm)',
                border: avatarBorder,
                background: avatarBackground,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: profile.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: statusColor, border: '2px solid var(--bg-raised)' }} />
              </div>

              {/* Action buttons */}
              {!isOwnProfile && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, gap: 5 }}>
                  <button onClick={addFriend} disabled={friendStatus !== 'none'} className={`add-friend-btn${friendStatus !== 'none' ? ' disabled' : ''}`}>
                    {friendStatus === 'friend' ? '✓ Friends' : friendStatus === 'pending' ? 'Pending' : '+ Add'}
                  </button>
                  <button onClick={toggleBlock} style={{ background: isBlocked ? 'var(--danger-dim)' : 'transparent', border: isBlocked ? '1px solid rgba(192,57,59,0.3)' : 'var(--border-bright)', color: isBlocked ? 'var(--danger)' : 'var(--gray-3)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 11, cursor: 'pointer', transition: 'all 0.1s' }}>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button onClick={() => setShowReport(true)} style={{ background: 'transparent', border: 'var(--border)', color: 'var(--gray-3)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 11, cursor: 'pointer', transition: 'all 0.1s' }}>
                    Report
                  </button>
                </div>
              )}
              {isOwnProfile && <div style={{ height: 36 }} />}
            </div>

            {/* Info card */}
            <div style={{ margin: '42px 12px 12px', background: 'var(--bg-float)', border: 'var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Name + status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: profile.username_color || 'var(--white)' }}>
                    {profile.banned ? 'Account Banned' : profile.username}
                  </h2>
                  {profile.is_admin && (
                    <span style={{ fontSize: 9, background: 'var(--bg-active)', color: 'var(--gray-3)', borderRadius: 'var(--radius-sm)', padding: '1px 5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Azeret Mono, monospace' }}>
                      ADMIN
                    </span>
                  )}
                </div>
                {!profile.banned && (
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-3)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Azeret Mono, monospace', letterSpacing: '0.02em' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
                    {isOnline ? getStatusLabel(profile.status) : 'Offline'}
                    {isOnline && profile.custom_status && <span style={{ color: 'var(--gray-2)' }}> / {profile.custom_status}</span>}
                  </p>
                )}
                {profile.pronouns && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gray-2)', fontFamily: 'Azeret Mono, monospace' }}>{profile.pronouns}</p>}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {profile.bio && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', fontFamily: 'Azeret Mono, monospace' }}>About</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-4)', margin: 0, lineHeight: 1.55 }}>{profile.bio}</p>
                </div>
              )}

              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px', fontFamily: 'Azeret Mono, monospace' }}>Member Since</p>
                <p style={{ fontSize: 11, color: 'var(--gray-3)', margin: 0, fontFamily: 'Azeret Mono, monospace' }}>{joined}</p>
              </div>

              {badges.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px', fontFamily: 'Azeret Mono, monospace' }}>Badges</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {badges.map(badge => (
                      <div key={badge.id} title={`${badge.label} — ${badge.desc}`}
                        style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'default', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {badge.emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friendMsg && <p style={{ fontSize: 10, color: 'var(--success)', margin: 0, fontFamily: 'Azeret Mono, monospace' }}>{friendMsg}</p>}
            </div>

            {/* Admin Controls */}
            {isAdmin && username !== user?.username && (
              <div style={{ margin: '0 12px 12px' }} className="profile-admin-section">
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px', fontFamily: 'Azeret Mono, monospace' }}>Admin</p>
                <form onSubmit={resetPassword} style={{ marginBottom: 6 }}>
                  <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" />
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 5 }}>Reset Password</button>
                </form>
                <form onSubmit={warnUser} style={{ marginBottom: 6 }}>
                  <input type="text" value={warningText} onChange={e => setWarningText(e.target.value)} placeholder="Warning message" />
                  <button type="submit" className="admin-warn-btn" style={{ width: '100%', marginTop: 5 }}>Warn</button>
                </form>
                <form onSubmit={banUser} style={{ marginBottom: 6 }}>
                  <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason" />
                  <button type="submit" className="admin-ban-btn" style={{ width: '100%', marginTop: 5 }}>Ban</button>
                </form>
                <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                  <button className="admin-unban-btn" onClick={unbanUser} style={{ flex: 1 }}>Unban</button>
                  <button className="admin-warn-btn" onClick={() => setShowDMViewer(true)} style={{ flex: 1 }}>View DMs</button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const reason = e.target.reason.value || 'No reason';
                  try { await api.patch(`/api/users/admin/clear-avatar/${username}`, { reason }); setResetMsg('PFP removed!'); setTimeout(() => setResetMsg(''), 3000); }
                  catch { setResetMsg('Error'); }
                }}>
                  <input name="reason" type="text" placeholder="Reason for removing pfp" />
                  <button type="submit" className="admin-ban-btn" style={{ width: '100%', marginTop: 5 }}>Remove PFP</button>
                </form>
                {resetMsg && <p className="profile-reset-msg">{resetMsg}</p>}
              </div>
            )}
          </>
        )}
        {showDMViewer && <AdminDMViewer onClose={() => setShowDMViewer(false)} />}
        {showReport && <ReportModal reportedUser={profile} onClose={() => setShowReport(false)} />}
      </div>
    </div>
  );
}