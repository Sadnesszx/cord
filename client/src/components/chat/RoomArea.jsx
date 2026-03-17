import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import ImageLightbox from '../ui/ImageLightbox';
import './ChatArea.css';

const formatTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function EmojiPicker({ onPick }) {
  const emojis = ['😀','😂','🥹','😍','🥰','😎','🤩','😭','😤','🤔','😴','🥳','😅','😬','🤯','😱','🥺','😏','🙄','😇','❤️','🔥','✨','💀','👍','👎','🙏','👏','🎉','💯','😈','👻','🤝','💪','🫶','👀','🫠','🤣','😆','😋','🐶','🐱','🐸','🐔','🦋','🌸','🌙','⭐','🌈','🍕','🍔','🍟','🎮','🎵','🏆','💎','🚀','💡','❓','‼️'];
  return (
    <div className="emoji-grid">
      {emojis.map((emoji, i) => (
        <button key={i} className="emoji-grid-btn" onMouseDown={e => { e.preventDefault(); onPick(emoji); }}>{emoji}</button>
      ))}
    </div>
  );
}

export default function RoomArea({ room, onLeave }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (!room) return;
    setMessages([]);
    api.get(`/api/rooms/${room.id}/messages`).then(({ data }) => {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });
    api.get(`/api/rooms/${room.id}/members`).then(({ data }) => setMembers(data));
    socket.emit('join_room', room.id);

    const onMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    const onDeleted = ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId));
    const onAvatarUpdated = ({ userId, avatar_url }) => setMessages(prev => prev.map(m => String(m.user_id) === String(userId) ? { ...m, avatar_url } : m));

    socket.on('new_room_message', onMessage);
    socket.on('room_message_deleted', onDeleted);
    socket.on('user_avatar_updated', onAvatarUpdated);

    return () => {
      socket.off('new_room_message', onMessage);
      socket.off('room_message_deleted', onDeleted);
      socket.off('user_avatar_updated', onAvatarUpdated);
    };
  }, [room?.id]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit('send_room_message', { roomId: room.id, content: input.trim() });
    setInput('');
    setShowEmoji(false);
  };

  const deleteMessage = (messageId) => {
    socket.emit('delete_room_message', { messageId, roomId: room.id });
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.data.url;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert('Image must be under 10MB');
    try {
      const url = await uploadImage(file);
      socket.emit('send_room_message', { roomId: room.id, content: `[img]${url}[/img]` });
    } catch (err) { console.error(err); }
  };

  const leaveRoom = async () => {
    try {
      await api.post(`/api/rooms/${room.id}/leave`);
      onLeave(room.id);
    } catch (err) { console.error(err); }
  };

  const deleteRoom = async () => {
    try {
      await api.delete(`/api/rooms/${room.id}`);
      onLeave(room.id);
    } catch (err) { console.error(err); }
  };

  if (!room) return null;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <span style={{ fontSize: 16 }}>🔒</span>
        <span className="chat-header-name">{room.name}</span>
        <span style={{ fontSize: 12, color: 'var(--gray-2)', marginLeft: 4 }}>• {room.member_count} members</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setShowCode(!showCode)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }} title="Room code">
            🔑 Code
          </button>
          <button onClick={() => setShowMembers(!showMembers)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
            👥 {members.length}
          </button>
          {String(room.owner_id) === String(user?.id) ? (
            <button onClick={deleteRoom} style={{ background: 'var(--danger-dim)', border: '1px solid rgba(237,66,69,0.2)', color: 'var(--danger)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
          ) : (
            <button onClick={leaveRoom} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>Leave</button>
          )}
        </div>
      </div>

      {/* Room code popup */}
      {showCode && (
        <div style={{ padding: '10px 16px', background: 'var(--bg-float)', borderBottom: 'var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gray-3)' }}>Room code:</span>
          <code style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', background: 'var(--bg-raised)', padding: '3px 10px', borderRadius: 6, letterSpacing: 2 }}>{room.code}</code>
          <button onClick={(e) => { navigator.clipboard.writeText(room.code).catch(() => {}); e.target.textContent = 'Copied!'; setTimeout(() => e.target.textContent = 'Copy', 2000); }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>Copy</button>
          <span style={{ fontSize: 12, color: 'var(--gray-2)', marginLeft: 4 }}>Share this with people you want to invite</span>
        </div>
      )}

      {/* Members popup */}
      {showMembers && (
        <div style={{ padding: '10px 16px', background: 'var(--bg-float)', borderBottom: 'var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {members.map(m => (
            <div key={m.id} onClick={() => setViewProfile(m.username)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: 'var(--bg-raised)' }}>
              {m.avatar_url ? <img src={m.avatar_url} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} alt={m.username} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: m.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>{m.username[0].toUpperCase()}</div>}
              <span style={{ fontSize: 12, color: 'var(--gray-4)' }}>{m.username}</span>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-start">
            <h3>Welcome to {room.name}!</h3>
            <p>This is the beginning of this room. Share the code <strong style={{ color: 'var(--accent)' }}>{room.code}</strong> to invite others.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="msg-group fade-in">
            {msg.avatar_url ? (
              <img src={msg.avatar_url} className="msg-avatar" style={{ objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewProfile(msg.username)} alt={msg.username} />
            ) : (
              <div className="msg-avatar" style={{ background: msg.avatar_color, cursor: 'pointer' }} onClick={() => setViewProfile(msg.username)}>
                {msg.username[0].toUpperCase()}
              </div>
            )}
            <div className="msg-content">
              <div className="msg-meta">
                <span className="msg-author">{msg.username}</span>
                <span className="msg-time">{formatTime(msg.created_at)}</span>
              </div>
              <div className="msg-text-wrapper">
                {msg.content.startsWith('[img]') && msg.content.endsWith('[/img]') ? (
                  <img src={msg.content.slice(5, -6)} alt="uploaded" className="msg-image" style={{ cursor: 'zoom-in' }} onClick={() => setLightboxUrl(msg.content.slice(5, -6))} />
                ) : (
                  <p className="msg-text">{msg.content}</p>
                )}
                <div className="msg-actions">
                  {(String(msg.user_id) === String(user?.id) || user?.is_admin) && (
                    <button className="msg-delete-btn" onClick={() => deleteMessage(msg.id)} title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onPick={(emoji) => { setInput(prev => prev + emoji); setShowEmoji(false); }} />
        </div>
      )}

      <div className="chat-input-wrapper">
        <form className="chat-input-form" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Message ${room.name}`}
            rows={1}
          />
          <label className="image-upload-btn" title="Upload image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          <button type="button" className="emoji-btn" onMouseDown={e => { e.preventDefault(); setShowEmoji(!showEmoji); }} title="Emoji">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>

      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}