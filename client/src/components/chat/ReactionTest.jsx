import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

const getColor = (ms) => {
  if (ms < 200) return '#23a55a';
  if (ms < 300) return '#5865f2';
  if (ms < 500) return '#f0b132';
  return '#f23f43';
};

const getRating = (ms) => {
  if (ms < 200) return '🔥 Superhuman';
  if (ms < 250) return '⚡ Excellent';
  if (ms < 300) return '✅ Great';
  if (ms < 400) return '👍 Average';
  if (ms < 500) return '😐 Below Average';
  return '🐢 Keep Practicing';
};

function Leaderboard({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For reaction test, lower is better — we store inverted score (10000 - ms)
    api.get('/api/scores/reaction').then(({ data }) => { setScores(data); setLoading(false); });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 420, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>⚡ Reaction Test — Top 10</span>
          <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {loading && <p style={{ color: 'var(--gray-2)', textAlign: 'center', padding: 20 }}>Loading...</p>}
          {!loading && scores.length === 0 && <p style={{ color: 'var(--gray-2)', textAlign: 'center', padding: 20 }}>No scores yet — be the first!</p>}
          {scores.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: i === 0 ? 'rgba(88,101,242,0.1)' : 'transparent', marginBottom: 4 }}>
              <span style={{ width: 24, fontWeight: 700, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--gray-3)', fontSize: 14 }}>#{i + 1}</span>
              {s.avatar_url ? <img src={s.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{s.username[0].toUpperCase()}</div>}
              <span style={{ flex: 1, color: 'var(--white)', fontSize: 14, fontWeight: 500 }}>{s.username}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: i === 0 ? '#ffd700' : getColor(10000 - s.score), fontSize: 15 }}>{10000 - s.score}ms</div>
                <div style={{ fontSize: 11, color: 'var(--gray-2)' }}>{getRating(10000 - s.score).split(' ').slice(1).join(' ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReactionTest({ onClose }) {
  const [state, setState] = useState('idle');
  const [reactionTime, setReactionTime] = useState(null);
  const [results, setResults] = useState([]);
  const [tooEarly, setTooEarly] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const startRef = useRef(null);
  const timeoutRef = useRef(null);

  const startRound = () => {
    setTooEarly(false);
    setState('waiting');
    const delay = 2000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setState('ready');
      startRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (state === 'idle') {
      startRound();
    } else if (state === 'waiting') {
      clearTimeout(timeoutRef.current);
      setTooEarly(true);
      setState('idle');
    } else if (state === 'ready') {
      const rt = Date.now() - startRef.current;
      setReactionTime(rt);
      const newResults = [...results, rt];
      setResults(newResults);
      setState('done');
      // Submit best score (inverted so higher = better in DB)
      const best = Math.min(...newResults);
      api.post('/api/scores', { game: 'reaction', score: 10000 - best, meta: { ms: best } }).catch(() => {});
    } else if (state === 'done') {
      startRound();
    }
  };

  const reset = () => { setResults([]); setReactionTime(null); setState('idle'); setTooEarly(false); };

  const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const best = results.length ? Math.min(...results) : 0;

  const bgColor = state === 'waiting' ? '#1a1a2e' : state === 'ready' ? '#23a55a' : '#1a1a2e';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Reaction Test</span>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span style={{ color: 'var(--gray-4)' }}>Avg: <strong style={{ color: 'var(--white)' }}>{avg}ms</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Best: <strong style={{ color: '#23a55a' }}>{best}ms</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Rounds: <strong style={{ color: 'var(--white)' }}>{results.length}</strong></span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>🏆 Leaderboard</button>
            <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
          </div>
        </div>

        <div onClick={handleClick} style={{ background: bgColor, cursor: 'pointer', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'background 0.1s', userSelect: 'none', minHeight: 280 }}>
          {state === 'idle' && (
            <>
              <div style={{ fontSize: 52 }}>⚡</div>
              <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Reaction Test</h2>
              <p style={{ color: 'var(--gray-3)', fontSize: 14, textAlign: 'center' }}>Wait for green, then click as fast as you can!</p>
              {tooEarly && <p style={{ color: '#f23f43', fontSize: 13, fontWeight: 600 }}>Too early! Wait for green.</p>}
              <div style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '10px 32px', fontSize: 15, fontWeight: 600 }}>Click to Start</div>
            </>
          )}
          {state === 'waiting' && (
            <>
              <div style={{ fontSize: 52 }}>🔴</div>
              <p style={{ color: 'var(--white)', fontSize: 20, fontWeight: 600 }}>Wait for green...</p>
              <p style={{ color: 'var(--gray-3)', fontSize: 13 }}>Don't click yet!</p>
            </>
          )}
          {state === 'ready' && (
            <>
              <div style={{ fontSize: 52 }}>🟢</div>
              <p style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>CLICK NOW!</p>
            </>
          )}
          {state === 'done' && (
            <>
              <div style={{ fontSize: 52 }}>⚡</div>
              <p style={{ color: getColor(reactionTime), fontSize: 42, fontWeight: 800 }}>{reactionTime}ms</p>
              <p style={{ color: 'var(--white)', fontSize: 16, fontWeight: 600 }}>{getRating(reactionTime)}</p>
              <p style={{ color: 'var(--gray-3)', fontSize: 13, marginTop: 4 }}>Click to go again</p>
            </>
          )}
        </div>

        {results.length >= 3 && (
          <div style={{ padding: '16px 20px', borderTop: 'var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {results.slice(-6).map((r, i) => (
                <div key={i} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: getColor(r), fontWeight: 600 }}>{r}ms</div>
              ))}
            </div>
            <button onClick={reset} style={{ background: 'transparent', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Reset</button>
          </div>
        )}
      </div>
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}