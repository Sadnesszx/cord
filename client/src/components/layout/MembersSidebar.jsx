import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import './MembersSidebar.css';
import { useAuth } from '../../context/AuthContext';

const getStatusColor = (isOnline, status) => {
  if (!isOnline) return '#80848e';
  switch (status) {
    case 'dnd': return '#f23f43';
    case 'idle': return '#f0b132';
    case 'invisible': return '#80848e';
    default: return '#23a55a';
  }
};

export default function MembersSidebar({ server }) {
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [viewProfile, setViewProfile] = useState(null);
  const { user } = useAuth();
  const isOwner = server?.owner_id === user?.id;

  useEffect(() => {
    if (!server) return;
    api.get(`/api/servers/${server.id}/members`).then(({ data }) => setMembers(data));
  }, [server?.id]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('get_online_users');
    socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('user_avatar_updated', ({ userId, avatar_url }) => {
      setMembers(prev => prev.map(m =>
        String(m.id) === String(userId) ? { ...m, avatar_url } : m
      ));
    });
    socket.on('user_status_updated', ({ userId, status, custom_status }) => {
      setMembers(prev => prev.map(m =>
        String(m.id) === String(userId) ? { ...m, status, custom_status } : m
      ));
    });
    socket.on('member_joined', ({ member }) => {
      setMembers(prev => {
        if (prev.find(m => String(m.id) === String(member.id))) return prev;
        return [...prev, member];
      });
    });
    return () => {
      socket.off('online_users');
      socket.off('user_avatar_updated');
      socket.off('user_status_updated');
      socket.off('member_joined');
    };
  }, [server?.id]);

  const kickMember = async (userId) => {
    try {
      await api.delete(`/api/servers/${server.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

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
                  <span className="status-dot online" style={{ background: getStatusColor(true, m.status) }} />
                </div>
                <span className="member-name">{m.username}</span>
                {isOwner && m.id !== user.id && (
                  <button className="member-kick-btn" title="Kick member" onClick={e => { e.stopPropagation(); kickMember(m.id); }}>
                    🥾
                  </button>
                )}
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
                  {m.avatar_url ? (
                    <img src={m.avatar_url} className="member-avatar" style={{ objectFit: 'cover' }} alt={m.username} />
                  ) : (
                    <div className="member-avatar" style={{ background: m.avatar_color }}>
                      {m.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="status-dot offline" style={{ background: getStatusColor(false, m.status) }} />
                </div>
                <span className="member-name">{m.username}</span>
                {isOwner && m.id !== user.id && (
                  <button className="member-kick-btn" title="Kick member" onClick={e => { e.stopPropagation(); kickMember(m.id); }}>
                    🥾
                  </button>
                )}
              </button>
            ))}
          </>
        )}
      </div>
      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}