import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import './ChatArea.css';
import ImageLightbox from '../ui/ImageLightbox';
import { createPortal } from 'react-dom';

const renderContent = (content, onMentionClick, onImageClick) => {
  if (content.startsWith('[img]') && content.endsWith('[/img]')) {
    const url = content.slice(5, -6);
    return <img src={url} alt="uploaded" className="msg-image" style={{ cursor: 'zoom-in' }} onClick={() => onImageClick(url)} />;
  }
  const combinedRegex = /(https?:\/\/[^\s]+|@\w+)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const mentionRegex = /(@\w+)/g;
  const parts = content.split(combinedRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">{part}</a>;
    }
    if (part.match(mentionRegex)) {
      return (
        <span key={i} className="mention-highlight" style={{ cursor: 'pointer' }} onClick={() => onMentionClick(part.slice(1))}>
          {part}
        </span>
      );
    }
    return part;
  });
};

const Avatar = ({ username, color, avatarUrl, onClick }) => (
  avatarUrl ? (
    <img src={avatarUrl} className="msg-avatar" style={{ objectFit: 'cover', cursor: 'pointer' }} alt={username} onClick={onClick} />
  ) : (
    <div className="msg-avatar" style={{ background: color || '#9898b8', cursor: 'pointer' }} onClick={onClick}>
      {username?.[0]?.toUpperCase()}
    </div>
  )
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
    if (msg.system) {
      groups.push({ type: 'system', content: msg.content, id: msg.id });
      return;
    }
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
        avatar_url: msg.avatar_url,
        messages: [msg],
      });
    }
  });
  return groups;
};

function EmojiPicker({ onPick }) {
  const emojis = [
    '😀','😂','🥹','😍','🥰','😎','🤩','😭','😤','🤔',
    '😴','🥳','😅','😬','🤯','😱','🥺','😏','🙄','😇',
    '❤️','🔥','✨','💀','👍','👎','🙏','👏','🎉','💯',
    '😈','👻','🤝','💪','🫶','👀','🫠','🤣','😆','😋',
    '🐶','🐱','🐸','🐔','🦋','🌸','🌙','⭐','🌈','🍕',
    '🍔','🍟','🎮','🎵','🏆','💎','🚀','💡','❓','‼️'
  ];
  return (
    <div className="emoji-grid">
      {emojis.map((emoji, i) => (
        <button key={i} className="emoji-grid-btn" onMouseDown={e => { e.preventDefault(); onPick(emoji); }}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionPicker({ onPick, position }) {
  const emojis = ['👍','👎','❤️','😂','😮','😢','🔥','💯','🎉','👏'];
  return (
    <div
      className="reaction-picker"
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      {emojis.map((emoji, i) => (
        <button key={i} className="reaction-picker-btn" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onPick(emoji); }}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default function ChatArea({ channel }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactions, setReactions] = useState({});
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const [viewProfile, setViewProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const socket = getSocket();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.reaction-picker') && !e.target.closest('.msg-react-btn')) {
        setActiveReactionPicker(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (messageId) => {
    if (!editContent.trim()) return;
    try {
      await api.patch(`/api/messages/${messageId}`, { content: editContent.trim() });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent.trim(), edited: true } : m));
      cancelEdit();
    } catch (err) {
      console.error(err);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.data.url;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert('Image must be under 10MB');
    try {
      const url = await uploadImage(file);
      socket.emit('send_message', { channelId: channel.id, content: `[img]${url}[/img]` });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/api/messages/${messageId}/react`, { emoji });
      const { data } = await api.get(`/api/channels/${channel.id}/reactions`);
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = {};
        if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = [];
        grouped[r.message_id][r.emoji].push(r.username);
      });
      setReactions(grouped);
      setActiveReactionPicker(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!channel) return;
    setMessages([]);
    setReactions({});
    setLoading(true);
    api.get(`/api/channels/${channel.id}/messages`).then(({ data }) => {
      setMessages(data);
      setLoading(false);
    });
    api.get(`/api/channels/${channel.id}/reactions`).then(({ data }) => {
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = {};
        if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = [];
        grouped[r.message_id][r.emoji].push(r.username);
      });
      setReactions(grouped);
    });

    socket.emit('join_channel', channel.id);

    const onMessage = (msg) => setMessages(prev => [...prev, msg]);
    const onTypingStart = ({ username }) => {
      if (username !== user.username)
        setTyping(prev => [...new Set([...prev, username])]);
    };
    const onTypingStop = ({ username }) => {
      setTyping(prev => prev.filter(u => u !== username));
    };
    const onAvatarUpdated = ({ userId, avatar_url }) => {
      setMessages(prev => prev.map(m =>
        String(m.user_id) === String(userId) ? { ...m, avatar_url } : m
      ));
    };
    const onUsernameUpdated = ({ userId, username }) => {
      setMessages(prev => prev.map(m =>
        String(m.user_id) === String(userId) ? { ...m, username } : m
      ));
    };
    const onMessageEdited = ({ messageId, content }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited: true } : m));
    };
    const onMemberJoined = ({ member, serverId }) => {
      if (channel?.server_id === serverId) {
        setMessages(prev => [...prev, {
          id: `join-${member.id}-${Date.now()}`,
          content: `${member.username} has joined the server!`,
          system: true,
          created_at: new Date().toISOString(),
        }]);
      }
    };

    socket.on('new_message', onMessage);
    socket.on('user_typing', onTypingStart);
    socket.on('user_stop_typing', onTypingStop);
    socket.on('user_avatar_updated', onAvatarUpdated);
    socket.on('user_username_updated', onUsernameUpdated);
    socket.on('message_edited', onMessageEdited);
    socket.on('member_joined', onMemberJoined);

    return () => {
      socket.off('new_message', onMessage);
      socket.off('user_typing', onTypingStart);
      socket.off('user_stop_typing', onTypingStop);
      socket.off('user_avatar_updated', onAvatarUpdated);
      socket.off('user_username_updated', onUsernameUpdated);
      socket.off('message_edited', onMessageEdited);
      socket.off('member_joined', onMemberJoined);
      setTyping([]);
    };
  }, [channel?.id]);

  useEffect(() => {
    if (!channel?.server_id) return;
    api.get(`/api/servers/${channel.server_id}/members`).then(({ data }) => setMembers(data));
  }, [channel?.id]);

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) return alert('Image must be under 10MB');
          try {
            const url = await uploadImage(file);
            socket.emit('send_message', { channelId: channel.id, content: `[img]${url}[/img]` });
          } catch (err) {
            console.error(err);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [channel?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !channel) return;
    socket.emit('send_message', { channelId: channel.id, content: input.trim() });
    setInput('');
    setShowEmoji(false);
    socket.emit('typing_stop', { channelId: channel.id });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      sendMessage(e);
      return;
    }
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
      <div className="chat-header">
        <span className="chat-header-hash">#</span>
        <span className="chat-header-name">{channel.name}</span>
      </div>

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
          if (group.type === 'system') {
            return (
              <div key={`system-${i}`} className="system-message">
                🎉 {group.content}
              </div>
            );
          }
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
            <div key={`group-${i}`} className="msg-group fade-in" onMouseLeave={() => setActiveReactionPicker(null)}>
              <Avatar username={group.username} color={group.avatar_color} avatarUrl={group.avatar_url} onClick={() => setViewProfile(group.username)} />
              <div className="msg-content">
                <div className="msg-meta">
                  <span className="msg-author">{group.username}</span>
                  <span className="msg-time">{formatTime(group.messages[0].created_at)}</span>
                </div>
                {group.messages.map((msg) => (
                  <div key={msg.id} className={`msg-text-wrapper ${activeReactionPicker === msg.id ? 'picker-open' : ''}`}>
                    {editingId === msg.id ? (
                      <div className="msg-edit-wrapper">
                        <textarea
                          className="msg-edit-input"
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                        <div className="msg-edit-actions">
                          <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                          <button className="btn-primary" onClick={() => saveEdit(msg.id)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="msg-text">
                          {renderContent(msg.content, (username) => setViewProfile(username), (url) => setLightboxUrl(url))}
                          {msg.edited && <span className="msg-edited">(edited)</span>}
                        </p>
                        <div className="msg-actions">
                          <button
                            className="msg-react-btn"
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (activeReactionPicker === msg.id) {
                                setActiveReactionPicker(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPickerPosition({ top: rect.bottom + 4, left: rect.left });
                                setActiveReactionPicker(msg.id);
                              }
                            }}
                            title="Add reaction"
                          >
                            😑
                          </button>
                          {msg.user_id === user?.id && (
                            <>
                              <button className="msg-edit-btn" onClick={() => startEdit(msg)} title="Edit message">✏️</button>
                              <button className="msg-delete-btn" onClick={() => deleteMessage(msg.id)} title="Delete message">🗑️</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                      <div className="msg-reactions">
                        {Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            className={`reaction-btn ${users.includes(user.username) ? 'reacted' : ''}`}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            title={users.join(', ')}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

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

      {/* Reaction picker rendered at fixed position outside message flow */}
      {activeReactionPicker && createPortal(
        <ReactionPicker
          onPick={(emoji) => toggleReaction(activeReactionPicker, emoji)}
          position={pickerPosition}
        />,
        document.body
      )}

      {showMentions && (
        <div className="mention-picker">
          {members
            .filter(m => m.username.toLowerCase().startsWith(mentionSearch.toLowerCase()))
            .slice(0, 5)
            .map(m => (
              <button key={m.id} className="mention-item" onClick={() => {
                const atIndex = input.lastIndexOf('@');
                setInput(input.slice(0, atIndex) + `@${m.username} `);
                setShowMentions(false);
              }}>
                <div className="mention-avatar" style={{ background: m.avatar_color }}>
                  {m.username[0].toUpperCase()}
                </div>
                <span>{m.username}</span>
              </button>
            ))}
        </div>
      )}

      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onPick={(emoji) => {
            setInput(prev => prev + emoji);
            setShowEmoji(false);
          }} />
        </div>
      )}

      <div className="chat-input-wrapper">
        <form className="chat-input-form" onSubmit={sendMessage}>
          <textarea
            className="chat-input"
            value={input}
            onChange={e => {
              const val = e.target.value;
              setInput(val);
              const atIndex = val.lastIndexOf('@');
              if (atIndex !== -1 && atIndex === val.length - 1) {
                setShowMentions(true);
                setMentionSearch('');
              } else if (atIndex !== -1 && val.slice(atIndex).match(/^@\w*$/)) {
                setShowMentions(true);
                setMentionSearch(val.slice(atIndex + 1));
              } else {
                setShowMentions(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}