import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ProfileModal.css';

export default function ProfileModal({ username, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [friendStatus, setFriendStatus] = useState('none'); // 'none' | 'friend' | 'pending'
  const [friendMsg, setFriendMsg] = useState('');
  const isAdmin = user?.username === 'Sadness';
  const isOwnProfile = user?.username === username;

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

    // Check friend status
    if (!isOwnProfile) {
      api.get('/api/friends').then(({ data }) => {
        if (data.find(f => f.username === username)) {
          setFriendStatus('friend');
        }
      });
    }
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

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>
        {loading && <p className="profile-loading">Loading...</p>}
        {!loading && profile && (
          <>
            <div className="profile-banner" style={{ background: profile.avatar_color }} />
            <div className="profile-avatar" style={{ background: profile.avatar_color }}>
              {profile.username[0].toUpperCase()}
            </div>
            <div className="profile-body">
              <div className="profile-top-row">
                <h2 className="profile-username">{profile.username}</h2>
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

             {isAdmin && username !== 'Sadness' && (
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

    {resetMsg && <p className="profile-reset-msg">{resetMsg}</p>}
  </div>
)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}