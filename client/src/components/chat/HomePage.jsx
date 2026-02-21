import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './HomePage.css';
import TOSPage from './TOSPage';

export default function HomePage({ onSelectFriend }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [showTOS, setShowTOS] = useState(false);

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

      <div className="home-section">
        <div className="home-section-label">Support</div>
        <button
          className="home-contact-btn"
          onClick={() => onSelectFriend({ id: '4b0b34aa-2f1e-4033-9e80-97accbb7edd3', username: 'Sadness' })}
        >
          💬 Contact Owner
        </button>
      </div>

      <div className="home-section">
        <div className="home-section-label">Legal</div>
        <button className="home-contact-btn" onClick={() => setShowTOS(true)}>
          📋 Terms of Service
        </button>
      </div>

      {showTOS && <TOSPage onClose={() => setShowTOS(false)} onAccept={() => setShowTOS(false)} />}
    </div>
  );
}