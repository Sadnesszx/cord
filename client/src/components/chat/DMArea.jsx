import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import ProfileModal from '../ui/ProfileModal';
import './ChatArea.css';
import ImageLightbox from '../ui/ImageLightbox';
import SearchBar from '../ui/SearchBar';

const formatTime = (ts) => {
  const date = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};

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

const renderDMContent = (content) => {
  const combinedRegex = /(https?:\/\/[^\s]+|@\w+)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const mentionRegex = /(@\w+)/g;
  const parts = content.split(combinedRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">{part}</a>;
    if (part.match(mentionRegex)) return <span key={i} className="mention-highlight">{part}</span>;
    return part;
  });
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

function ReactionPicker({ onPick }) {
  const emojis = ['👍','👎','❤️','😂','😮','😢','🔥','💯','🎉','👏'];
  return (
    <div className="reaction-picker">
      {emojis.map((emoji, i) => (
        <button key={i} className="reaction-picker-btn" onMouseDown={e => { e.preventDefault(); onPick(emoji); }}>{emoji}</button>
      ))}
    </div>
  );
}

export default function DMArea({ friend }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reactions, setReactions] = useState({});
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const [viewProfile, setViewProfile] = useState(null);
  const socket = getSocket();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const deleteDM = async (messageId) => {
    try {
      await api.delete(`/api/friends/dm/message/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) { console.error(err); }
  };

  const startEdit = (msg) => { setEditingId(msg.id); setEditContent(msg.content); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };

  const saveEdit = async (messageId) => {
    if (!editContent.trim()) return;
    try {
      await api.patch(`/api/friends/dm/message/${messageId}`, { content: editContent.trim() });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent.trim(), edited: true } : m));
      cancelEdit();
    } catch (err) { console.error(err); }
  };

  const sendMessage = (content) => {
    if (!content.trim()) return;
    const replyContent = replyTo ? `> **${replyTo.username}:** ${replyTo.content?.startsWith('[img]') ? '🖼️ Image' : replyTo.content?.slice(0, 60)}\n` : '';
    socket.emit('send_dm', { receiverId: friend.id, content: replyContent + content.trim() });
    socket.emit('dm_typing_stop', { receiverId: friend.id });
    setInput('');
    setShowEmoji(false);
    setReplyTo(null);
  };

  const uploadAndSendImage = async (file) => {
    if (file.size > 10 * 1024 * 1024) return alert('Image must be under 10MB');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
      const data = await res.json();
      socket.emit('send_dm', { receiverId: friend.id, content: `[img]${data.data.url}[/img]` });
      setReplyTo(null);
    } catch (err) { console.error(err); }
  };

  const loadReactions = async () => {
    if (!friend) return;
    const { data } = await api.get(`/api/friends/dm/${friend.id}/reactions`);
    const grouped = {};
    data.forEach(r => {
      if (!grouped[r.message_id]) grouped[r.message_id] = {};
      if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = [];
      grouped[r.message_id][r.emoji].push(r.username);
    });
    setReactions(grouped);
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/api/friends/dm/message/${messageId}/react`, { emoji });
      await loadReactions();
      setActiveReactionPicker(null);
    } catch (err) { console.error(err); }
  };

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
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
            const data = await res.json();
            socket.emit('send_dm', { receiverId: friend.id, content: `[img]${data.data.url}[/img]` });
          } catch (err) { console.error(err); }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [friend?.id]);

  useEffect(() => {
    if (!friend) return;
    setMessages([]); setReactions({}); setTyping(false); setReplyTo(null);
    api.get(`/api/friends/dm/${friend.id}`).then(({ data }) => {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });
    loadReactions();

    const onDM = (msg) => {
      if ((msg.sender_id === friend.id && msg.receiver_id === user.id) || (msg.sender_id === user.id && msg.receiver_id === friend.id)) {
        setMessages(prev => [...prev, msg]);
        if (msg.sender_id === friend.id) playNotification();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };
    const onTypingStart = () => setTyping(true);
    const onTypingStop = () => setTyping(false);
    const onAvatarUpdated = ({ userId, avatar_url }) => setMessages(prev => prev.map(m => String(m.sender_id) === String(userId) ? { ...m, avatar_url } : m));
    const onDMEdited = ({ messageId, content }) => setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited: true } : m));

    socket.on('new_dm', onDM);
    socket.on('dm_user_typing', onTypingStart);
    socket.on('dm_user_stop_typing', onTypingStop);
    socket.on('user_avatar_updated', onAvatarUpdated);
    socket.on('dm_edited', onDMEdited);

    return () => {
      socket.off('new_dm', onDM);
      socket.off('dm_user_typing', onTypingStart);
      socket.off('dm_user_stop_typing', onTypingStop);
      socket.off('user_avatar_updated', onAvatarUpdated);
      socket.off('dm_edited', onDMEdited);
    };
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
        {friend.avatar_url ? (
          <img src={friend.avatar_url} className="msg-avatar" style={{ objectFit: 'cover', width: 26, height: 26, borderRadius: 4 }} alt={friend.username} />
        ) : (
          <div className="msg-avatar" style={{ background: friend.avatar_color, width: 26, height: 26, fontSize: 11, borderRadius: 4 }}>
            {friend.username[0].toUpperCase()}
          </div>
        )}
        <span className="chat-header-name">{friend.username}</span>
        <div style={{ marginLeft: 'auto' }}>
          <SearchBar friendId={friend.id} onJumpTo={(msg) => {
            const el = document.getElementById(`dm-${msg.id}`);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setHighlightedId(msg.id); setTimeout(() => setHighlightedId(null), 2000); }
          }} />
        </div>
      </div>

      <div className="chat-messages" ref={containerRef}>
        <div style={{ flex: 1 }} />
        {messages.length === 0 && <div className="chat-start"><h3>Start of DM with {friend.username}</h3></div>}
        {messages.map((msg) => (
          <div key={msg.id} id={`dm-${msg.id}`} className={`msg-group fade-in ${highlightedId === msg.id ? 'msg-highlighted' : ''}`}>
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
                {editingId === msg.id ? (
                  <div className="msg-edit-wrapper">
                    <textarea className="msg-edit-input" value={editContent} onChange={e => setEditContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus />
                    <div className="msg-edit-actions">
                      <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                      <button className="btn-primary" onClick={() => saveEdit(msg.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content.startsWith('[img]') && msg.content.endsWith('[/img]') ? (
                      <img src={msg.content.slice(5, -6)} alt="uploaded" className="msg-image" style={{ cursor: 'zoom-in' }} onClick={() => setLightboxUrl(msg.content.slice(5, -6))} />
                    ) : (
                      <p className="msg-text">
                        {renderDMContent(msg.content)}
                        {msg.edited && <span className="msg-edited">(edited)</span>}
                      </p>
                    )}
                    <div className="msg-actions">
                      <button className="msg-reply-btn" onClick={() => { setReplyTo({ id: msg.id, username: msg.username, content: msg.content }); inputRef.current?.focus(); }} title="Reply">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button className="msg-react-btn" onMouseDown={e => { e.preventDefault(); setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id); }} title="Add reaction">😑</button>
                        {activeReactionPicker === msg.id && <ReactionPicker onPick={(emoji) => toggleReaction(msg.id, emoji)} />}
                      </div>
                      {msg.sender_id === user?.id && (
                        <>
                          <button className="msg-edit-btn" onClick={() => startEdit(msg)} title="Edit message">✏️</button>
                          <button className="msg-delete-btn" onClick={() => deleteDM(msg.id)} title="Delete message">🗑️</button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                  <div className="msg-reactions">
                    {Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                      <button key={emoji} className={`reaction-btn ${users.includes(user.username) ? 'reacted' : ''}`} onClick={() => toggleReaction(msg.id, emoji)} title={users.join(', ')}>
                        {emoji} {users.length}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {typing && (
          <div className="typing-indicator fade-in">
            <div className="typing-dots"><span /><span /><span /></div>
            <span className="typing-text">{friend.username} is typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onPick={(emoji) => { setInput(prev => prev + emoji); setShowEmoji(false); }} />
        </div>
      )}

      <div className="chat-input-wrapper">
        {replyTo && (
          <div className="reply-bar">
            <span>Replying to <strong>{replyTo.username}</strong> — {replyTo.content?.startsWith('[img]') ? '🖼️ Image' : replyTo.content?.slice(0, 60)}</span>
            <button onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        <form className="chat-input-form">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              socket.emit('dm_typing_start', { receiverId: friend.id });
              clearTimeout(typingTimeout.current);
              typingTimeout.current = setTimeout(() => socket.emit('dm_typing_stop', { receiverId: friend.id }), 2000);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              if (e.key === 'Escape' && replyTo) setReplyTo(null);
            }}
            placeholder={replyTo ? `Replying to ${replyTo.username}...` : `Message ${friend.username}`}
            rows={1}
          />
          <label className="image-upload-btn" title="Upload image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files[0]; if (file) uploadAndSendImage(file); }} />
          </label>
          <button type="button" className="emoji-btn" onMouseDown={e => { e.preventDefault(); setShowEmoji(!showEmoji); }} title="Emoji">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          <button className="chat-send-btn" type="button" onClick={() => sendMessage(input)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>

      {viewProfile && <ProfileModal username={viewProfile} onClose={() => setViewProfile(null)} />}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}