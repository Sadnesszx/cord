import { useState, useEffect } from 'react';
import api from '../../lib/api';
import './FriendsSidebar.css';

export default function FriendsSidebar({ activeFriend, onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('friends');

  const load = () => {
    api.get('/api/friends').then(({ data }) => setFriends(data));
    api.get('/api/friends/requests').then(({ data }) => setRequests(data));
  };

  useEffect(() => { load(); }, []);

  const sendRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/friends/request', { username });
      setMsg('Request sent!');
      setUsername('');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const respond = async (id, action) => {
    await api.post(`/api/friends/requests/${id}/respond`, { action });
    load();
  };

  return (
    <div className="friends-sidebar">
      <div className="friends-header">
        <span>Direct Messages</span>
        <button className="friends-add-btn" onClick={() => setShowAdd(!showAdd)}>+</button>
      </div>

      {showAdd && (
        <form className="friends-add-form" onSubmit={sendRequest}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Add by username" autoFocus />
          <button type="submit">Send Request</button>
          {msg && <p className="friends-msg">{msg}</p>}
        </form>
      )}

      <div className="friends-tabs">
        <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
          Friends {friends.length > 0 && <span className="badge">{friends.length}</span>}
        </button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
          Requests {requests.length > 0 && <span className="badge">{requests.length}</span>}
        </button>
      </div>

      <div className="friends-list">
        {tab === 'friends' && (
          <>
            {friends.length === 0 && <p className="friends-empty">No friends yet.<br/>Add someone with the + button!</p>}
            {friends.map(f => (
              <button key={f.id} className={`friend-item ${activeFriend?.id === f.id ? 'active' : ''}`} onClick={() => onSelectFriend(f)}>
                <div className="friend-avatar" style={{ background: f.avatar_color }}>{f.username[0].toUpperCase()}</div>
                <span>{f.username}</span>
              </button>
            ))}
          </>
        )}
        {tab === 'requests' && (
          <>
            {requests.length === 0 && <p className="friends-empty">No pending requests</p>}
            {requests.map(r => (
              <div key={r.id} className="request-item">
                <div className="friend-avatar" style={{ background: r.avatar_color }}>{r.username[0].toUpperCase()}</div>
                <span>{r.username}</span>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => respond(r.id, 'accept')}>✓</button>
                  <button className="decline-btn" onClick={() => respond(r.id, 'decline')}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
