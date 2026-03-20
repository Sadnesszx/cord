import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import './ProfileModal.css';
import AdminDMViewer from './AdminDMViewer';
import ReportModal from './ReportModal';

const getStatusColor = (status) => {
  switch (status) {
    case 'dnd': return '#f23f43';
    case 'idle': return '#f0b132';
    case 'invisible': return '#80848e';
    case 'offline': return '#80848e';
    default: return '#23a55a';
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
    } catch (err) { setResetMsg('Error'); }
  };

  const banUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/ban', { username, reason: banReason });
      setResetMsg(`${username} banned!`);
      setBanReason('');
      setTimeout(() => setResetMsg(''), 3000);
    } catch (err) { setResetMsg('Error'); }
  };

  const unbanUser = async () => {
    try {
      await api.post('/api/admin/unban', { username });
      setResetMsg(`${username} unbanned!`);
      setTimeout(() => setResetMsg(''), 3000);
    } catch (err) { setResetMsg('Error'); }
  };

  useEffect(() => {
    api.get(`/api/users/${username}`).then(({ data }) => {
      setProfile(data);
      setLoading(false);
      if (!isOwnProfile && data?.id) {
        api.get(`/api/friends/block/${data.id}`).then(({ data: blockData }) => setIsBlocked(blockData.blocked)).catch(() => {});
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
      setFriendMsg('Friend request sent!');
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
    } catch (err) {
      setResetMsg(err.response?.data?.error || 'Error');
    }
  };

  const toggleBlock = async () => {
    if (!profile) return;
    try {
      if (isBlocked) {
        await api.delete(`/api/friends/block/${profile.id}`);
        setIsBlocked(false);
      } else {
        await api.post(`/api/friends/block/${profile.id}`);
        setIsBlocked(true);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', width: 340, borderRadius: 12 }}>
        <button className="profile-close" onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>✕</button>

        {loading && <p className="profile-loading" style={{ padding: 40 }}>Loading...</p>}

        {!loading && profile && (
          <>
            {/* Banner */}
            <div style={{
              height: 90,
              background: profile.profile_border === 'rainbow'
                ? 'linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff)'
                : (profile.banner_color || profile.avatar_color || '#2a2a2a'),
              position: 'relative',
              flexShrink: 0,
            }} />

            {/* Avatar overlapping banner */}
            <div style={{ position: 'relative', padding: '0 16px' }}>
              <div style={{
                position: 'absolute',
                top: -40,
                left: 16,
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: profile.profile_border && profile.profile_border !== 'rainbow'
                  ? `4px solid ${profile.profile_border}`
                  : profile.profile_border === 'rainbow'
                  ? '4px solid transparent'
                  : '4px solid var(--bg-raised)',
                background: profile.profile_border === 'rainbow'
                  ? 'linear-gradient(var(--bg-raised), var(--bg-raised)) padding-box, linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff) border-box'
                  : undefined,
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: profile.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                {/* Status dot */}
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: statusColor, border: '3px solid var(--bg-raised)' }} />
              </div>

              {/* Action buttons top right */}
              {!isOwnProfile && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, gap: 6 }}>
                  <button onClick={addFriend} disabled={friendStatus !== 'none'} style={{ background: friendStatus !== 'none' ? 'var(--bg-float)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: friendStatus !== 'none' ? 'default' : 'pointer', opacity: friendStatus !== 'none' ? 0.6 : 1 }}>
                    {friendStatus === 'friend' ? '✓ Friends' : friendStatus === 'pending' ? 'Pending' : '+ Add Friend'}
                  </button>
                  <button onClick={toggleBlock} style={{ background: isBlocked ? 'var(--danger-dim)' : 'var(--bg-float)', border: isBlocked ? '1px solid rgba(237,66,69,0.3)' : 'var(--border-bright)', color: isBlocked ? 'var(--danger)' : 'var(--gray-3)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                    🚫
                  </button>
                  <button onClick={() => setShowReport(true)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                    ⚠️
                  </button>
                </div>
              )}
              {isOwnProfile && <div style={{ paddingTop: 10, height: 36 }} />}
            </div>

            {/* Profile info card */}
            <div style={{ margin: '44px 12px 12px', background: 'var(--bg-float)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Name + status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: profile.username_color || 'var(--white)' }}>
                    {profile.banned ? 'Account Banned' : profile.username}
                  </h2>
                  {profile.is_admin && <span style={{ fontSize: 10, background: 'rgba(88,101,242,0.2)', color: '#5865f2', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>ADMIN</span>}
                </div>
                {!profile.banned && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
                    {isOnline ? getStatusLabel(profile.status) : 'Offline'}
                    {isOnline && profile.custom_status && <span style={{ color: '#666' }}> — {profile.custom_status}</span>}
                  </p>
                )}
                {profile.pronouns && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#666' }}>{profile.pronouns}</p>}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* About me */}
              {profile.bio && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 4px' }}>About Me</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-4)', margin: 0, lineHeight: 1.5 }}>{profile.bio}</p>
                </div>
              )}

              {/* Member since */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 2px' }}>Member Since</p>
                <p style={{ fontSize: 13, color: 'var(--gray-4)', margin: 0 }}>{joined}</p>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-2)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>Badges</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {badges.map(badge => (
                      <div key={badge.id} title={`${badge.label} — ${badge.desc}`} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)', border: 'var(--border-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'default', transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {badge.emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friendMsg && <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0 }}>{friendMsg}</p>}
            </div>

            {/* Admin Controls */}
            {isAdmin && username !== user?.username && (
              <div style={{ margin: '0 12px 12px', background: 'rgba(237,66,69,0.05)', border: '1px solid rgba(237,66,69,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f23f43', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 10px' }}>Admin Controls</p>
                <form onSubmit={resetPassword} style={{ marginBottom: 8 }}>
                  <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password for user" style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#e8e8e8', fontSize: 12, marginBottom: 6 }} />
                  <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 12 }}>Reset Password</button>
                </form>
                <form onSubmit={warnUser} style={{ marginBottom: 8 }}>
                  <input type="text" value={warningText} onChange={e => setWarningText(e.target.value)} placeholder="Warning message" style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#e8e8e8', fontSize: 12, marginBottom: 6 }} />
                  <button type="submit" className="admin-warn-btn" style={{ width: '100%', fontSize: 12 }}>Send Warning</button>
                </form>
                <form onSubmit={banUser} style={{ marginBottom: 8 }}>
                  <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason" style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#e8e8e8', fontSize: 12, marginBottom: 6 }} />
                  <button type="submit" className="admin-ban-btn" style={{ width: '100%', fontSize: 12 }}>Ban User</button>
                </form>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="admin-unban-btn" onClick={unbanUser} style={{ flex: 1, fontSize: 12 }}>Unban</button>
                  <button className="admin-warn-btn" onClick={() => setShowDMViewer(true)} style={{ flex: 1, fontSize: 12 }}>View DMs</button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const reason = e.target.reason.value || 'No reason provided';
                  try {
                    await api.patch(`/api/users/admin/clear-avatar/${username}`, { reason });
                    setResetMsg('Profile picture removed!');
                    setTimeout(() => setResetMsg(''), 3000);
                  } catch (err) { setResetMsg('Error'); }
                }} style={{ marginTop: 8 }}>
                  <input name="reason" type="text" placeholder="Reason for removing pfp" style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#e8e8e8', fontSize: 12, marginBottom: 6 }} />
                  <button type="submit" className="admin-ban-btn" style={{ width: '100%', fontSize: 12 }}>Remove Profile Picture</button>
                </form>
                {resetMsg && <p style={{ fontSize: 12, color: '#23a55a', marginTop: 6 }}>{resetMsg}</p>}
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