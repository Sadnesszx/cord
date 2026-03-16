import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import ProfileModal from '../ui/ProfileModal';
import './FriendsSidebar.css';

const getStatusColor = (isOnline, status) => {
  if (!isOnline) return '#80848e';
  switch (status) {
    case 'dnd': return '#f23f43';
    case 'idle': return '#f0b132';
    case 'invisible': return '#80848e';
    default: return '#23a55a';
  }
};

export default function FriendsSidebar({ activeFriend, onSelectFriend, unreadDMs = {} }) {
  const { user } = useAuth();
  const isAdmin = user?.username === 'Sadness';
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('friends');
  const [viewProfile, setViewProfile] = useState(null);

  const load = () => {
    api.get('/api/friends').then(({ data }) => setFriends(data));
    api.get('/api/friends/requests').then(({ data }) => setRequests(data));
    if (isAdmin) {
      api.get('/api/friends/inbox/all').then(({ data }) => setInbox(data)).catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const socket = getSocket();
if (socket.connected) {
  socket.emit('get_online_users');
} else {
  socket.once('connect', () => socket.emit('get_online_users'));
}
socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('new_friend_request', () => {
      api.get('/api/friends/requests').then(({ data }) => setRequests(data));
    });
    socket.on('friend_request_accepted', (newFriend) => {
      setFriends(prev => {
        if (prev.find(f => f.id === newFriend.id)) return prev;
        return [...prev, newFriend];
      });
      setRequests(prev => prev.filter(r => r.id !== newFriend.id));
    });
    socket.on('friend_removed', ({ userId }) => {
      setFriends(prev => prev.filter(f => String(f.id) !== String(userId)));
    });
    socket.on('user_avatar_updated', ({ userId, avatar_url }) => {
      setFriends(prev => prev.map(f =>
        String(f.id) === String(userId) ? { ...f, avatar_url } : f
      ));
    });
    socket.on('user_status_updated', ({ userId, status, custom_status }) => {
  setFriends(prev => prev.map(f =>
    String(f.id) === String(userId) ? { ...f, status, custom_status } : f
  ));
});
    return () => {
      socket.off('online_users');
      socket.off('new_friend_request');
      socket.off('friend_request_accepted');
      socket.off('friend_removed');
      socket.off('user_avatar_updated');
      socket.off('user_status_updated');
    };
  }, []);

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

  const unfriend = async (friendId) => {
    await api.delete(`/api/friends/${friendId}`);
    load();
    if (activeFriend?.id === friendId) onSelectFriend(null);
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
        {isAdmin && (
          <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>
            Inbox {inbox.length > 0 && <span className="badge">{inbox.length}</span>}
          </button>
        )}
      </div>

      <div className="friends-list">
        {tab === 'friends' && (
          <>
            {friends.length === 0 && <p className="friends-empty">No friends yet.<br/>Add someone with the + button!</p>}
            {friends.map(f => (
              <div key={f.id} className={`friend-item ${activeFriend?.id === f.id ? 'active' : ''}`}>
                <button className="friend-item-main" onClick={() => onSelectFriend(f)}>
                  <div className="friend-avatar-wrapper">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} className="friend-avatar" style={{ objectFit: 'cover' }} alt={f.username} />
                    ) : (
                      <div className="friend-avatar" style={{ background: f.avatar_color }}>
                        {f.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`status-dot ${onlineUsers.map(id => String(id)).includes(String(f.id)) ? 'online' : 'offline'}`}
                      style={{ background: getStatusColor(onlineUsers.map(id => String(id)).includes(String(f.id)), f.status) }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                     <span>{f.username}</span>
                     {f.custom_status && <span style={{ fontSize: 11, color: '#888' }}>{f.custom_status}</span>}
                 </div>
                 {unreadDMs[f.id] && <span className="unread-badge" />}
                </button>
                <button className="view-profile-btn" onClick={() => setViewProfile(f.username)} title="View profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                </button>
                <button className="unfriend-btn" onClick={() => unfriend(f.id)} title="Unfriend">✕</button>
              </div>
            ))}
          </>
        )}
        {tab === 'requests' && (
          <>
            {requests.length === 0 && <p className="friends-empty">No pending requests</p>}
            {requests.map(r => (
              <div key={r.id} className="request-item">
                {r.avatar_url ? (
                  <img src={r.avatar_url} className="friend-avatar" style={{ objectFit: 'cover' }} alt={r.username} />
                ) : (
                  <div className="friend-avatar" style={{ background: r.avatar_color }}>{r.username[0].toUpperCase()}</div>
                )}
                <span>{r.username}</span>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => respond(r.id, 'accept')}>✓</button>
                  <button className="decline-btn" onClick={() => respond(r.id, 'decline')}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}
        {tab === 'inbox' && (
          <>
            {inbox.length === 0 && <p className="friends-empty">No messages yet</p>}
            {inbox.map(u => (
              <button key={u.id} className={`friend-item-main ${activeFriend?.id === u.id ? 'active' : ''}`} onClick={() => onSelectFriend(u)}>
                <div className="friend-avatar-wrapper">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="friend-avatar" style={{ objectFit: 'cover' }} alt={u.username} />
                  ) : (
                    <div className="friend-avatar" style={{ background: u.avatar_color }}>
                      {u.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, color: 'var(--white)' }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.last_message}</div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}