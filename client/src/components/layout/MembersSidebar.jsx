import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import './MembersSidebar.css';
import { useAuth } from '../../context/AuthContext';
import { useBlockedUsers } from '../../lib/useBlockedUsers';

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
  const blockedIds = useBlockedUsers();
  const [blockedByIds, setBlockedByIds] = useState([]);

  useEffect(() => {
    api.get('/api/friends/blocked-by').then(({ data }) => setBlockedByIds(data.map(u => String(u.id)))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!server) return;
    api.get(`/api/servers/${server.id}/members`).then(({ data }) => setMembers(data));
  }, [server?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) socket.emit('get_online_users');
    else socket.once('connect', () => socket.emit('get_online_users'));
    socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('user_avatar_updated', ({ userId, avatar_url }) => setMembers(prev => prev.map(m => String(m.id) === String(userId) ? { ...m, avatar_url } : m)));
    socket.on('user_username_updated', ({ userId, username }) => setMembers(prev => prev.map(m => String(m.id) === String(userId) ? { ...m, username } : m)));
    socket.on('user_status_updated', ({ userId, status, custom_status }) => setMembers(prev => prev.map(m => String(m.id) === String(userId) ? { ...m, status, custom_status } : m)));
    socket.on('member_joined', ({ member }) => setMembers(prev => prev.find(m => String(m.id) === String(member.id)) ? prev : [...prev, member]));
    socket.on('member_left', ({ userId }) => setMembers(prev => prev.filter(m => String(m.id) !== String(userId))));
    return () => {
      socket.off('online_users');
      socket.off('user_avatar_updated');
      socket.off('user_status_updated');
      socket.off('member_joined');
      socket.off('member_left');
    };
  }, [server?.id]);

  const kickMember = async (userId) => {
    try {
      await api.delete(`/api/servers/${server.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) { console.error(err); }
  };

  if (!server) return null;

  const isBlocked = (memberId) => blockedIds.includes(String(memberId));
  const blockedByMe = (memberId) => blockedIds.includes(String(memberId));
  const hasBlockedMe = (memberId) => blockedByIds.includes(String(memberId));

  // Blocked members always appear offline, and users who blocked you appear offline to you
  const onlineIds = onlineUsers.map(id => String(id));
  const online = members.filter(m => onlineIds.includes(String(m.id)) && !blockedByMe(m.id) && !hasBlockedMe(m.id));
  const offline = members.filter(m => !onlineIds.includes(String(m.id)) || blockedByMe(m.id) || hasBlockedMe(m.id));

  const renderMember = (m, isOnline) => (
    <button key={m.id} className={`member-item ${!isOnline ? 'offline' : ''}`} onClick={() => setViewProfile(m.username)}>
      <div className="member-avatar-wrapper">
        {m.avatar_url ? (
          <img src={m.avatar_url} className="member-avatar" style={{ objectFit: 'cover', filter: isBlocked(m.id) ? 'grayscale(1) opacity(0.5)' : 'none' }} alt={m.username} />
        ) : (
          <div className="member-avatar" style={{ background: m.avatar_color, opacity: isBlocked(m.id) ? 0.5 : 1 }}>
            {m.username[0].toUpperCase()}
          </div>
        )}
        <span className="status-dot" style={{ background: isBlocked(m.id) ? '#80848e' : getStatusColor(isOnline, m.status) }} />
      </div>
      <span className="member-name" style={{ opacity: isBlocked(m.id) ? 0.5 : 1 }}>{m.username}</span>
      {isOwner && m.id !== user.id && (
        <button className="member-kick-btn" title="Kick member" onClick={e => { e.stopPropagation(); kickMember(m.id); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
        </button>
      )}
    </button>
  );

  return (
    <div className="members-sidebar">
      <div className="members-header">Members — {members.length}</div>
      <div className="members-list">
        {online.length > 0 && (
          <>
            <p className="members-section-label">Online — {online.length}</p>
            {online.map(m => renderMember(m, true))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="members-section-label">Offline — {offline.length}</p>
            {offline.map(m => renderMember(m, false))}
          </>
        )}
      </div>
      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}