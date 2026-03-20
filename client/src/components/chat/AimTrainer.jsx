import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api';

const GAME_DURATION = 30;
const TARGET_SIZE = 50;

function Leaderboard({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/scores/aim').then(({ data }) => { setScores(data); setLoading(false); });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 420, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>🎯 Aim Trainer — Top 10</span>
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
              <span style={{ fontWeight: 700, color: i === 0 ? '#ffd700' : 'var(--white)', fontSize: 15 }}>{s.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AimTrainer({ onClose }) {
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState('idle');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [lastTargetTime, setLastTargetTime] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const areaRef = useRef(null);
  const timerRef = useRef(null);
  const targetTimerRef = useRef(null);
  const scoreRef = useRef(0);

  const spawnTarget = useCallback(() => {
    if (!areaRef.current) return;
    const area = areaRef.current.getBoundingClientRect();
    const x = Math.random() * (area.width - TARGET_SIZE);
    const y = Math.random() * (area.height - TARGET_SIZE);
    const id = Date.now();
    setTargets([{ id, x, y }]);
    setLastTargetTime(Date.now());
    targetTimerRef.current = setTimeout(() => {
      setTargets([]);
      setMisses(prev => prev + 1);
      spawnTarget();
    }, 1500);
  }, []);

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0); setHits(0); setMisses(0); setReactionTimes([]); setTimeLeft(GAME_DURATION); setTargets([]);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    spawnTarget();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearTimeout(targetTimerRef.current);
          setTargets([]);
          setFinalScore(scoreRef.current);
          setGameState('done');
          api.post('/api/scores', { game: 'aim', score: scoreRef.current }).then(({ data }) => { if (data.ticketsEarned > 0) setTicketsEarned(data.ticketsEarned); }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(targetTimerRef.current); };
  }, [gameState]);

  const handleTargetClick = (e, id) => {
    e.stopPropagation();
    clearTimeout(targetTimerRef.current);
    const rt = Date.now() - lastTargetTime;
    setReactionTimes(prev => [...prev, rt]);
    setHits(prev => prev + 1);
    const pts = Math.max(10, Math.round(1000 / rt * 10));
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setTargets([]);
    spawnTarget();
  };

  const handleMissClick = () => { if (gameState === 'playing') setMisses(prev => prev + 1); };

  const avgReaction = reactionTimes.length ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0;
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 700, height: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Aim Trainer</span>
          </div>
          {gameState === 'playing' && (
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <span style={{ color: 'var(--gray-4)' }}>Score: <strong style={{ color: 'var(--white)' }}>{score}</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Hits: <strong style={{ color: '#23a55a' }}>{hits}</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Misses: <strong style={{ color: '#f23f43' }}>{misses}</strong></span>
              <span style={{ color: timeLeft <= 5 ? '#f23f43' : 'var(--gray-4)' }}>Time: <strong style={{ color: timeLeft <= 5 ? '#f23f43' : 'var(--white)' }}>{timeLeft}s</strong></span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>🏆 Leaderboard</button>
            <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
          </div>
        </div>

        {gameState === 'idle' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Aim Trainer</h2>
            <p style={{ color: 'var(--gray-3)', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>Click targets as fast as you can. You have {GAME_DURATION} seconds. Score is based on reaction time!</p>
            <button onClick={startGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>Start Game</button>
          </div>
        )}

        {gameState === 'playing' && (
          <div ref={areaRef} onClick={handleMissClick} style={{ flex: 1, position: 'relative', cursor: 'crosshair', background: 'var(--bg-base)' }}>
            {targets.map(t => (
              <button key={t.id} onClick={e => handleTargetClick(e, t.id)} style={{ position: 'absolute', left: t.x, top: t.y, width: TARGET_SIZE, height: TARGET_SIZE, borderRadius: '50%', background: 'radial-gradient(circle, #ff4444 30%, #cc0000 100%)', border: '3px solid rgba(255,255,255,0.3)', cursor: 'crosshair', boxShadow: '0 0 16px rgba(255,68,68,0.6)', animation: 'targetPop 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
              </button>
            ))}
          </div>
        )}

        {gameState === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Game Over!</h2>
            {ticketsEarned > 0 && <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '6px 16px', fontSize: 14, color: '#ffd700', fontWeight: 600 }}>🎟️ +{ticketsEarned} tickets earned!</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: 320, marginTop: 8 }}>
              {[
                { label: 'Score', value: finalScore.toLocaleString(), color: '#5865f2' },
                { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 70 ? '#23a55a' : '#f0b132' },
                { label: 'Avg Reaction', value: `${avgReaction}ms`, color: avgReaction < 300 ? '#23a55a' : avgReaction < 500 ? '#f0b132' : '#f23f43' },
                { label: 'Hits / Misses', value: `${hits} / ${misses}`, color: 'var(--gray-4)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={startGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Play Again</button>
              <button onClick={() => setShowLeaderboard(true)} style={{ background: 'var(--bg-float)', color: 'var(--gray-4)', border: 'var(--border-bright)', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' }}>🏆 Leaderboard</button>
              <button onClick={onClose} style={{ background: 'var(--bg-float)', color: 'var(--gray-4)', border: 'var(--border-bright)', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}
      </div>
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      <style>{`@keyframes targetPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}