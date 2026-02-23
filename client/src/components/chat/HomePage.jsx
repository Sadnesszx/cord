import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './HomePage.css';
import TOSPage from './TOSPage';

export default function HomePage({ onSelectFriend }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [showTOS, setShowTOS] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    api.get('/api/friends').then(({ data }) => setFriends(data));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const sendFeedback = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFeedbackSending(true);
    try {
      await api.post('/api/users/feedback', { message: feedback.trim() });
      setFeedbackMsg('✅ Feedback sent! Thank you!');
      setFeedback('');
    } catch (err) {
      setFeedbackMsg('❌ Failed to send feedback.');
    } finally {
      setFeedbackSending(false);
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  return (
    <div className="home-page">
      <div className="home-greeting">
        {user?.avatar_url ? (
          <img src={user.avatar_url} className="home-avatar" style={{ objectFit: 'cover' }} alt={user.username} />
        ) : (
          <div className="home-avatar" style={{ background: user?.avatar_color || '#555' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="home-greeting-text">
          <h1>{greeting}, <span>{user?.username}</span></h1>
          <p>What's on your mind today?</p>
        </div>
      </div>

      {showInstallBanner && (
  <div style={{
    background: '#1a1a2e',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 16,
    fontSize: 13,
    color: '#aaa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  }}>
    <span>
      📱 <strong style={{ color: '#e8e8e8' }}>Install SadLounge!</strong>
      {' '}Chrome/Edge: click the install icon in the URL bar.
      {' '}Firefox: not supported yet.
      {' '}iOS Safari: tap Share → Add to Home Screen.
    </span>
    <button onClick={() => setShowInstallBanner(false)} style={{
      background: 'none', border: 'none', color: '#555',
      cursor: 'pointer', fontSize: 16, flexShrink: 0,
    }}>✕</button>
  </div>
)}

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
              {f.avatar_url ? (
                <img src={f.avatar_url} className="home-friend-avatar" style={{ objectFit: 'cover' }} alt={f.username} />
              ) : (
                <div className="home-friend-avatar" style={{ background: f.avatar_color }}>
                  {f.username[0].toUpperCase()}
                </div>
              )}
              <span>{f.username}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-label">Feedback</div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
          Got a suggestion or found a bug? Let us know!
        </p>
        <form onSubmit={sendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Write your feedback here..."
            maxLength={500}
            rows={4}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '10px 12px',
              color: '#e8e8e8',
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#555' }}>{feedback.length}/500</span>
            <button
              type="submit"
              className="btn-primary"
              disabled={!feedback.trim() || feedbackSending}
              style={{ padding: '6px 16px' }}
            >
              {feedbackSending ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
          {feedbackMsg && <p style={{ fontSize: 13, color: feedbackMsg.startsWith('✅') ? '#23a55a' : '#f23f43' }}>{feedbackMsg}</p>}
        </form>
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