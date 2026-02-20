import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import './ChatArea.css';

const Avatar = ({ username, color }) => (
  <div className="msg-avatar" style={{ background: color || '#9898b8' }}>
    {username?.[0]?.toUpperCase()}
  </div>
);

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
};

const groupMessages = (messages) => {
  const groups = [];
  let lastDate = null;

  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (date !== lastDate) {
      groups.push({ type: 'divider', date: msg.created_at });
      lastDate = date;
    }
    const last = groups[groups.length - 1];
    if (last?.type === 'group' && last.user_id === msg.user_id) {
      last.messages.push(msg);
    } else {
      groups.push({
        type: 'group',
        user_id: msg.user_id,
        username: msg.username,
        avatar_color: msg.avatar_color,
        messages: [msg],
      });
    }
  });
  return groups;
};

export default function ChatArea({ channel }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const socket = getSocket();

  const deleteMessage = (messageId) => {
  socket.emit('delete_message', { messageId, channelId: channel.id });
};

  // Load messages
  useEffect(() => {
    if (!channel) return;
    setMessages([]);
    setLoading(true);
    api.get(`/api/channels/${channel.id}/messages`).then(({ data }) => {
      setMessages(data);
      setLoading(false);
    });

    // Join socket room
    socket.emit('join_channel', channel.id);

    const onMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };
    const onTypingStart = ({ username }) => {
      if (username !== user.username)
        setTyping(prev => [...new Set([...prev, username])]);
    };
    const onTypingStop = ({ username }) => {
      setTyping(prev => prev.filter(u => u !== username));
    };

    socket.on('new_message', onMessage);
    socket.on('user_typing', onTypingStart);
    socket.on('user_stop_typing', onTypingStop);

    const onDeleted = ({ messageId }) => {
  setMessages(prev => prev.filter(m => m.id !== messageId));
};
socket.on('message_deleted', onDeleted);

return () => {
  socket.off('new_message', onMessage);
  socket.off('user_typing', onTypingStart);
  socket.off('user_stop_typing', onTypingStop);
  socket.off('message_deleted', onDeleted);
  setTyping([]);
};
  }, [channel?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !channel) return;
    socket.emit('send_message', { channelId: channel.id, content: input.trim() });
    setInput('');
    socket.emit('typing_stop', { channelId: channel.id });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      sendMessage(e);
      return;
    }
    // Typing indicator
    socket.emit('typing_start', { channelId: channel.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', { channelId: channel.id });
    }, 2000);
  };

  if (!channel) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">#</div>
        <h2>Pick a channel</h2>
        <p>Select a channel from the sidebar to start chatting</p>
      </div>
    );
  }

  const groups = groupMessages(messages);

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <span className="chat-header-hash">#</span>
        <span className="chat-header-name">{channel.name}</span>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading && <div className="chat-loading">Loading messages...</div>}

        {!loading && messages.length === 0 && (
          <div className="chat-start">
            <div className="chat-start-icon">#</div>
            <h3>Welcome to #{channel.name}</h3>
            <p>This is the beginning of the #{channel.name} channel.</p>
          </div>
        )}

        {groups.map((group, i) => {
          if (group.type === 'divider') {
            return (
              <div key={`divider-${i}`} className="msg-date-divider">
                <div className="msg-date-line" />
                <span className="msg-date-label">{formatDate(group.date)}</span>
                <div className="msg-date-line" />
              </div>
            );
          }
          return (
            <div key={`group-${i}`} className="msg-group fade-in">
              <Avatar username={group.username} color={group.avatar_color} />
              <div className="msg-content">
                <div className="msg-meta">
                  <span className="msg-author">{group.username}</span>
                  <span className="msg-time">{formatTime(group.messages[0].created_at)}</span>
                </div>
                {group.messages.map((msg) => (
  <div key={msg.id} className="msg-text-wrapper">
    <p className="msg-text">{msg.content}</p>
    {msg.user_id === user?.id && (
      <button
        className="msg-delete-btn"
        onClick={() => deleteMessage(msg.id)}
        title="Delete message"
      >
        ✕
      </button>
    )}
  </div>
))}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="typing-indicator fade-in">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            <span className="typing-text">
              {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-wrapper">
        <form className="chat-input-form" onSubmit={sendMessage}>
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            rows={1}
          />
          <button
            className="chat-send-btn"
            type="submit"
            disabled={!input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
