import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function SearchBar({ channelId, friendId, onJumpTo }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const timeout = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        let data;
        if (channelId) {
          ({ data } = await api.get(`/api/channels/${channelId}/search?q=${encodeURIComponent(query)}`));
        } else if (friendId) {
          ({ data } = await api.get(`/api/friends/dm/${friendId}/search?q=${encodeURIComponent(query)}`));
        }
        setResults(data || []);
      } catch {}
      finally { setLoading(false); }
    }, 400);
  }, [query, channelId, friendId]);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
    else setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', color: 'var(--gray-3)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, transition: 'color 0.15s' }}
        title="Search messages"
        onMouseEnter={e => e.currentTarget.style.color = 'var(--white)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-3)'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 6, padding: '4px 10px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--gray-3)"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          placeholder="Search messages..."
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--white)', fontSize: 13, width: 180 }}
        />
        {loading && <span style={{ color: 'var(--gray-2)', fontSize: 11 }}>...</span>}
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray-3)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
      </div>

      {(results.length > 0 || (query && !loading)) && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--bg-raised)', border: 'var(--border-bright)',
          borderRadius: 8, width: 360, maxHeight: 400, overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)', zIndex: 1000,
        }}>
          {results.length === 0 && (
            <p style={{ padding: '16px', color: 'var(--gray-2)', fontSize: 13, textAlign: 'center' }}>No results for "{query}"</p>
          )}
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => { onJumpTo(r); setOpen(false); setQuery(''); setResults([]); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: 'var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.avatar_url ? (
                  <img src={r.avatar_url} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} alt={r.username} />
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: r.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{r.username?.[0]?.toUpperCase()}</div>
                )}
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--white)' }}>{r.username}</span>
                <span style={{ fontSize: 11, color: 'var(--gray-2)', marginLeft: 'auto' }}>{formatTime(r.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.content?.startsWith('[img]') ? '🖼️ Image' : r.content}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}