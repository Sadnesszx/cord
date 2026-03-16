import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import './ProfileModal.css';
import AdminDMViewer from './AdminDMViewer';

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
  const isAdmin = user?.is_admin;
  const isOwnProfile = user?.username === username;
  const [showDMViewer, setShowDMViewer] = useState(false);

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
    }).catch(() => setLoading(false));

    if (!isOwnProfile) {
      api.get('/api/friends').then(({ data }) => {
        if (data.find(f => f.username === username)) {
          setFriendStatus('friend');
        }
      });
    }

    const socket = getSocket();
    socket.emit('get_online_users');
    socket.on('online_users', (users) => setOnlineUsers(users));
    return () => socket.off('online_users');
  }, [username]);

  const joined = profile ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';

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

  const isOnline = profile ? onlineUsers.map(id => String(id)).includes(String(profile.id)) : false;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>
        {loading && <p className="profile-loading">Loading...</p>}
        {!loading && profile && (
          <>
            <div className="profile-banner" style={{ background: profile.banned ? '#1a1a1a' : (profile.banner_color || profile.avatar_color) }} />
            <div className="profile-avatar" style={{ background: profile.banned ? '#2a2a2a' : profile.avatar_color, overflow: 'hidden', padding: 0 }}>
              {profile.banned ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
              ) : profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.username[0].toUpperCase()
              )}
              
            </div>
            <div className="profile-body">
              <div className="profile-top-row">
                <div>
                  <h2 className="profile-username">{profile.banned ? 'Account Banned' : profile.username}</h2>
                  {!profile.banned && (
                    <p style={{ 
                       fontSize: 12, 
                       color: getStatusColor(isOnline ? profile.status : 'offline'), 
                       margin: '4px 0 0 0',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 5
                      }}>
                        <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: getStatusColor(isOnline ? profile.status : 'offline'),
                        display: 'inline-block', flexShrink: 0
                       }} />
                      <span style={{ color: '#a0a0b0' }}>
                       {isOnline ? getStatusLabel(profile.status) : 'Offline'}
                       {isOnline && profile.custom_status && ` — ${profile.custom_status}`}
                      </span>
                    </p>
                  )}
                </div>
                {!isOwnProfile && (
                  <button
                    className={`add-friend-btn ${friendStatus !== 'none' ? 'disabled' : ''}`}
                    onClick={addFriend}
                    disabled={friendStatus !== 'none'}
                  >
                    {friendStatus === 'friend' ? '✓ Friends' : friendStatus === 'pending' ? 'Pending...' : '+ Add Friend'}
                  </button>
                )}
              </div>
              {friendMsg && <p className="profile-friend-msg">{friendMsg}</p>}

              {profile.bio ? (
                <div className="profile-bio-section">
                  <p className="profile-bio-label">About me</p>
                  <p className="profile-bio">{profile.bio}</p>
                </div>
              ) : (
                <p className="profile-no-bio">No bio yet.</p>
              )}
              <p className="profile-joined">Joined {joined}</p>

              {isAdmin && !profile?.is_admin && (
                <div className="profile-admin-section">
                  <p className="profile-bio-label">Admin Controls</p>

                  <form onSubmit={resetPassword}>
                    <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password for user" />
                    <button type="submit" className="btn-primary" style={{ marginTop: 8, width: '100%' }}>Reset Password</button>
                  </form>

                  <form onSubmit={warnUser}>
                    <input type="text" value={warningText} onChange={e => setWarningText(e.target.value)} placeholder="Warning message (leave empty to clear)" />
                    <button type="submit" className="admin-warn-btn" style={{ marginTop: 8, width: '100%' }}>Send Warning</button>
                  </form>

                  <form onSubmit={banUser}>
                    <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason" />
                    <button type="submit" className="admin-ban-btn" style={{ marginTop: 8, width: '100%' }}>Ban User</button>
                  </form>

                  <button className="admin-unban-btn" onClick={unbanUser} style={{ width: '100%' }}>Unban User</button>

                  <button
                    className="admin-warn-btn"
                    onClick={() => setShowDMViewer(true)}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    View User DMs
               </button>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const reason = e.target.reason.value || 'No reason provided';
                    try {
                      await api.patch(`/api/users/admin/clear-avatar/${username}`, { reason });
                      setResetMsg('Profile picture removed!');
                      setTimeout(() => setResetMsg(''), 3000);
                    } catch (err) { setResetMsg('Error'); }
                  }}>
                    <input name="reason" type="text" placeholder="Reason for removing pfp" />
                    <button type="submit" className="admin-ban-btn" style={{ width: '100%', marginTop: 8 }}>
                      Remove Profile Picture
                    </button>
                  </form>

                  {resetMsg && <p className="profile-reset-msg">{resetMsg}</p>}
                </div>
              )}
            </div>
            {showDMViewer && <AdminDMViewer onClose={() => setShowDMViewer(false)} />}
          </>
        )}
      </div>
    </div>
  );
}