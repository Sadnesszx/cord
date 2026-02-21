import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import './MembersSidebar.css';

export default function MembersSidebar({ server }) {
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [viewProfile, setViewProfile] = useState(null);

  useEffect(() => {
    if (!server) return;
    api.get(`/api/servers/${server.id}/members`).then(({ data }) => setMembers(data));
  }, [server?.id]);

  useEffect(() => {
  const socket = getSocket();
  socket.emit('get_online_users');
  socket.on('online_users', (users) => setOnlineUsers(users));
  return () => socket.off('online_users');
}, [server?.id]);

  if (!server) return null;

const online = members.filter(m => onlineUsers.map(id => String(id)).includes(String(m.id)));
const offline = members.filter(m => !onlineUsers.map(id => String(id)).includes(String(m.id)));

  return (
    <div className="members-sidebar">
      <div className="members-header">Members — {members.length}</div>
      <div className="members-list">
        {online.length > 0 && (
          <>
            <p className="members-section-label">Online — {online.length}</p>
            {online.map(m => (
              <button key={m.id} className="member-item" onClick={() => setViewProfile(m.username)}>
                <div className="member-avatar-wrapper">
                  {m.avatar_url ? (
  <img src={m.avatar_url} className="member-avatar" style={{ objectFit: 'cover' }} alt={m.username} />
) : (
  <div className="member-avatar" style={{ background: m.avatar_color }}>
    {m.username[0].toUpperCase()}
  </div>
)}
                  <span className="status-dot online" />
                </div>
                <span className="member-name">{m.username}</span>
              </button>
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="members-section-label">Offline — {offline.length}</p>
            {offline.map(m => (
              <button key={m.id} className="member-item offline" onClick={() => setViewProfile(m.username)}>
                <div className="member-avatar-wrapper">
                  <div className="member-avatar" style={{ background: m.avatar_color }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <span className="status-dot offline" />
                </div>
                <span className="member-name">{m.username}</span>
              </button>
            ))}
          </>
        )}
      </div>
      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}