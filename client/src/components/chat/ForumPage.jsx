import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const formatTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function Avatar({ username, avatarUrl, avatarColor, size = 32 }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {username?.[0]?.toUpperCase()}
    </div>
  );
}

function ThreadView({ thread, onBack, onDelete, currentUser }) {
  const [reply, setReply] = useState('');
  const [replies, setReplies] = useState(thread.replies || []);
  const [sending, setSending] = useState(false);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/forums/${thread.id}/replies`, { content: reply.trim() });
      setReplies(prev => [...prev, data]);
      setReply('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const deleteReply = async (replyId) => {
    try {
      await api.delete(`/api/forums/${thread.id}/replies/${replyId}`);
      setReplies(prev => prev.filter(r => r.id !== replyId));
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back button + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <h2 style={{ color: 'var(--white)', fontSize: 18, fontWeight: 700, flex: 1 }}>{thread.title}</h2>
        {(String(thread.user_id) === String(currentUser?.id) || currentUser?.is_admin) && (
          <button onClick={() => onDelete(thread.id)} style={{ background: 'var(--danger-dim)', border: '1px solid rgba(237,66,69,0.2)', color: 'var(--danger)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
        )}
      </div>

      {/* Original post */}
      <div style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar username={thread.username} avatarUrl={thread.avatar_url} avatarColor={thread.avatar_color} />
          <div>
            <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 14 }}>{thread.username}</span>
            <span style={{ color: 'var(--gray-2)', fontSize: 11, marginLeft: 8 }}>{formatTime(thread.created_at)}</span>
          </div>
        </div>
        <p style={{ color: 'var(--gray-4)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{thread.content}</p>
      </div>

      {/* Replies */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {replies.length === 0 && <p style={{ color: 'var(--gray-2)', fontSize: 13, textAlign: 'center', padding: 20 }}>No replies yet — be the first!</p>}
        {replies.map(r => (
          <div key={r.id} style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Avatar username={r.username} avatarUrl={r.avatar_url} avatarColor={r.avatar_color} size={28} />
              <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{r.username}</span>
              <span style={{ color: 'var(--gray-2)', fontSize: 11, marginLeft: 4 }}>{formatTime(r.created_at)}</span>
              {(String(r.user_id) === String(currentUser?.id) || currentUser?.is_admin) && (
                <button onClick={() => deleteReply(r.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--gray-2)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>✕</button>
              )}
            </div>
            <p style={{ color: 'var(--gray-4)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{r.content}</p>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <form onSubmit={sendReply} style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
          placeholder="Write a reply..."
          rows={2}
          style={{ flex: 1, background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 8, padding: '10px 12px', color: 'var(--white)', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }}
        />
        <button type="submit" disabled={!reply.trim() || sending} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !reply.trim() || sending ? 0.5 : 1 }}>
          Reply
        </button>
      </form>
    </div>
  );
}

export default function ForumPage({ onClose }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  const loadThreads = () => {
    api.get('/api/forums').then(({ data }) => { setThreads(data); setLoading(false); });
  };

  useEffect(() => { loadThreads(); }, []);

  const openThread = async (id) => {
    const { data } = await api.get(`/api/forums/${id}`);
    setActiveThread(data);
  };

  const createThread = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      await api.post('/api/forums', { title: title.trim(), content: content.trim() });
      setTitle(''); setContent(''); setShowCreate(false);
      loadThreads();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const deleteThread = async (id) => {
    try {
      await api.delete(`/api/forums/${id}`);
      setActiveThread(null);
      loadThreads();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 720, height: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Forums</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!activeThread && (
              <button onClick={() => setShowCreate(!showCreate)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Thread</button>
            )}
            <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Create thread form */}
          {showCreate && !activeThread && (
            <form onSubmit={createThread} style={{ padding: '16px 20px', borderBottom: 'var(--border)', background: 'var(--bg-float)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Thread title" maxLength={100} style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 8, padding: '8px 12px', color: 'var(--white)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind?" rows={3} style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 8, padding: '8px 12px', color: 'var(--white)', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={!title.trim() || !content.trim() || creating} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !title.trim() || !content.trim() ? 0.5 : 1 }}>{creating ? 'Posting...' : 'Post Thread'}</button>
              </div>
            </form>
          )}

          {/* Thread list or thread view */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {activeThread ? (
              <ThreadView thread={activeThread} onBack={() => setActiveThread(null)} onDelete={deleteThread} currentUser={user} />
            ) : (
              <>
                {loading && <p style={{ color: 'var(--gray-2)', textAlign: 'center', padding: 40 }}>Loading...</p>}
                {!loading && threads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                    <p style={{ color: 'var(--gray-3)', fontSize: 14 }}>No threads yet — start a conversation!</p>
                  </div>
                )}
                {threads.map(t => (
                  <div key={t.id} onClick={() => openThread(t.id)} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.1s', marginBottom: 6, border: 'var(--border-bright)', background: 'var(--bg-float)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-float)'}
                  >
                    <Avatar username={t.username} avatarUrl={t.avatar_url} avatarColor={t.avatar_color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ color: 'var(--gray-3)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.content}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ color: 'var(--gray-2)', fontSize: 11 }}>{formatTime(t.last_reply_at || t.created_at)}</span>
                      <span style={{ color: 'var(--gray-3)', fontSize: 11 }}>💬 {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}</span>
                      <span style={{ color: 'var(--gray-2)', fontSize: 11 }}>by {t.username}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}