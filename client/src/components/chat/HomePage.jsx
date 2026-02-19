import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './HomePage.css';

export default function HomePage({ onSelectFriend }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    api.get('/api/friends').then(({ data }) => setFriends(data));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="home-page">
      <div className="home-greeting">
        <div className="home-avatar" style={{ background: user?.avatar_color || '#555' }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="home-greeting-text">
          <h1>{greeting}, <span>{user?.username}</span></h1>
          <p>What's on your mind today?</p>
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-label">Direct Messages</div>
        {friends.length === 0 && (
          <div className="home-empty">
            <p>No friends yet — add someone to start chatting!</p>
          </div>
        )}
        <div className="home-friends-grid">
          {friends.map(f => (
            <button key={f.id} className="home-friend-card" onClick={() => onSelectFriend(f)}>
              <div className="home-friend-avatar" style={{ background: f.avatar_color }}>
                {f.username[0].toUpperCase()}
              </div>
              <span>{f.username}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}