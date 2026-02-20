import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ChatArea.css';
import ProfileModal from '../ui/ProfileModal';

const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const playNotification = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = 880;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
};

export default function DMArea({ friend }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const socket = getSocket();
  const [viewProfile, setViewProfile] = useState(null);

  useEffect(() => {
    if (!friend) return;
    setMessages([]);
    api.get(`/api/friends/dm/${friend.id}`).then(({ data }) => {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });

    const onDM = (msg) => {
      if (
        (msg.sender_id === friend.id && msg.receiver_id === user.id) ||
        (msg.sender_id === user.id && msg.receiver_id === friend.id)
      ) {
        setMessages(prev => [...prev, msg]);
        if (msg.sender_id === friend.id) playNotification();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    socket.on('new_dm', onDM);
    return () => socket.off('new_dm', onDM);
  }, [friend?.id]);

  if (!friend) return (
    <div className="chat-empty">
      <div className="chat-empty-icon">💬</div>
      <h2>No chat selected</h2>
      <p>Pick a friend to start messaging</p>
    </div>
  );

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="msg-avatar" style={{ background: friend.avatar_color, width: 26, height: 26, fontSize: 11, borderRadius: 4 }}>
          {friend.username[0].toUpperCase()}
        </div>
        <span className="chat-header-name">{friend.username}</span>
      </div>

      <div className="chat-messages" ref={containerRef}>
  <div style={{ flex: 1 }} />
  {messages.length === 0 && (
    <div className="chat-start">
      <h3>Start of DM with {friend.username}</h3>
    </div>
  )}
  {messages.map((msg) => (
    <div key={msg.id} className="msg-group fade-in">
      <div
  className="msg-avatar"
  style={{ background: msg.avatar_color, cursor: 'pointer' }}
  onClick={() => setViewProfile(msg.username)}
>
  {msg.username[0].toUpperCase()}
</div>
      <div className="msg-content">
        <div className="msg-meta">
          <span className="msg-author">{msg.username}</span>
          <span className="msg-time">{formatTime(msg.created_at)}</span>
        </div>
        <p className="msg-text">{msg.content}</p>
      </div>
    </div>
  ))}
  <div ref={bottomRef} />
</div>

      <div className="chat-input-wrapper">
        <form className="chat-input-form">
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!input.trim()) return;
                socket.emit('send_dm', { receiverId: friend.id, content: input.trim() });
                setInput('');
              }
            }}
            placeholder={`Message ${friend.username}`}
            rows={1}
          />
          <button className="chat-send-btn" type="button" onClick={() => {
            if (!input.trim()) return;
            socket.emit('send_dm', { receiverId: friend.id, content: input.trim() });
            setInput('');
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>

{viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}

    </div>
  );
}