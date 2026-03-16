import { useState, useEffect, useRef, useCallback } from 'react';

const GAME_DURATION = 30;
const TARGET_SIZE = 50;

export default function AimTrainer({ onClose }) {
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState('idle'); // idle, playing, done
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [lastTargetTime, setLastTargetTime] = useState(null);
  const areaRef = useRef(null);
  const timerRef = useRef(null);
  const targetTimerRef = useRef(null);

  const spawnTarget = useCallback(() => {
    if (!areaRef.current) return;
    const area = areaRef.current.getBoundingClientRect();
    const x = Math.random() * (area.width - TARGET_SIZE);
    const y = Math.random() * (area.height - TARGET_SIZE);
    const id = Date.now();
    setTargets([{ id, x, y }]);
    setLastTargetTime(Date.now());

    // Auto-remove after 1.5s (miss)
    targetTimerRef.current = setTimeout(() => {
      setTargets([]);
      setMisses(prev => prev + 1);
      spawnTarget();
    }, 1500);
  }, []);

  const startGame = () => {
    setScore(0);
    setHits(0);
    setMisses(0);
    setReactionTimes([]);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
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
          setGameState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(targetTimerRef.current);
    };
  }, [gameState]);

  const handleTargetClick = (e, id) => {
    e.stopPropagation();
    clearTimeout(targetTimerRef.current);
    const rt = Date.now() - lastTargetTime;
    setReactionTimes(prev => [...prev, rt]);
    setHits(prev => prev + 1);
    setScore(prev => prev + Math.max(10, Math.round(1000 / rt * 10)));
    setTargets([]);
    spawnTarget();
  };

  const handleMissClick = () => {
    if (gameState !== 'playing') return;
    setMisses(prev => prev + 1);
  };

  const avgReaction = reactionTimes.length
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  const accuracy = hits + misses > 0
    ? Math.round((hits / (hits + misses)) * 100)
    : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--bg-raised)', border: 'var(--border-bright)',
        borderRadius: 16, width: 700, height: 520,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: 'var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Aim Trainer</span>
          </div>
          {gameState === 'playing' && (
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <span style={{ color: 'var(--gray-4)' }}>Score: <strong style={{ color: 'var(--white)' }}>{score}</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Hits: <strong style={{ color: '#23a55a' }}>{hits}</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Misses: <strong style={{ color: '#f23f43' }}>{misses}</strong></span>
              <span style={{ color: timeLeft <= 5 ? '#f23f43' : 'var(--gray-4)' }}>
                Time: <strong style={{ color: timeLeft <= 5 ? '#f23f43' : 'var(--white)' }}>{timeLeft}s</strong>
              </span>
            </div>
          )}
          <button onClick={onClose} style={{
            background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}>✕</button>
        </div>

        {/* Game area */}
        {gameState === 'idle' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Aim Trainer</h2>
            <p style={{ color: 'var(--gray-3)', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>
              Click targets as fast as you can. You have {GAME_DURATION} seconds. Score is based on reaction time!
            </p>
            <button onClick={startGame} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 32px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer', marginTop: 8,
            }}>Start Game</button>
          </div>
        )}

        {gameState === 'playing' && (
          <div
            ref={areaRef}
            onClick={handleMissClick}
            style={{
              flex: 1, position: 'relative', cursor: 'crosshair',
              background: 'var(--bg-base)',
            }}
          >
            {targets.map(t => (
              <button
                key={t.id}
                onClick={e => handleTargetClick(e, t.id)}
                style={{
                  position: 'absolute',
                  left: t.x, top: t.y,
                  width: TARGET_SIZE, height: TARGET_SIZE,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #ff4444 30%, #cc0000 100%)',
                  border: '3px solid rgba(255,255,255,0.3)',
                  cursor: 'crosshair',
                  boxShadow: '0 0 16px rgba(255,68,68,0.6)',
                  animation: 'targetPop 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.8)',
                }} />
              </button>
            ))}
          </div>
        )}

        {gameState === 'done' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Game Over!</h2>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              width: 320, marginTop: 8,
            }}>
              {[
                { label: 'Score', value: score, color: '#5865f2' },
                { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 70 ? '#23a55a' : '#f0b132' },
                { label: 'Avg Reaction', value: `${avgReaction}ms`, color: avgReaction < 300 ? '#23a55a' : avgReaction < 500 ? '#f0b132' : '#f23f43' },
                { label: 'Hits / Misses', value: `${hits} / ${misses}`, color: 'var(--gray-4)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'var(--bg-float)', border: 'var(--border-bright)',
                  borderRadius: 10, padding: '12px 16px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={startGame} style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}>Play Again</button>
              <button onClick={onClose} style={{
                background: 'var(--bg-float)', color: 'var(--gray-4)',
                border: 'var(--border-bright)', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes targetPop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}