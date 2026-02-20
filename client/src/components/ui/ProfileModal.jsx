import { useState, useEffect } from 'react';
import api from '../../lib/api';
import './ProfileModal.css';

export default function ProfileModal({ username, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/users/${username}`).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [username]);

  const joined = profile ? new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        {loading && <p className="profile-loading">Loading...</p>}
        {!loading && profile && (
          <>
            <div className="profile-header" style={{ background: profile.avatar_color }} />
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
            </div>
          </>
        )}
        <button className="profile-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}