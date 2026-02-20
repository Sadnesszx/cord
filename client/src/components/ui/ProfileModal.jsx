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
  const isAdmin = user?.username === 'Sadness';

  useEffect(() => {
    api.get(`/api/users/${username}`).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  const joined = profile ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';

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
              <h2 className="profile-username">{profile.username}</h2>
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
                  <p className="profile-bio-label">Admin — Reset Password</p>
                  <form onSubmit={resetPassword}>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password for user"
                    />
                    <button type="submit" className="btn-primary" style={{ marginTop: 8, width: '100%' }}>
                      Reset Password
                    </button>
                  </form>
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