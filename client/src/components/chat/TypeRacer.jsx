import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog",
  "Pack my box with five dozen liquor jugs",
  "How vexingly quick daft zebras jump",
  "The five boxing wizards jump quickly",
  "Sphinx of black quartz judge my vow",
  "Two driven jocks help fax my big quiz",
  "The job requires extra pluck and zeal from every young wage earner",
  "A mad boxer shot a quick gloved jab to the jaw of his dizzy opponent",
  "Sixty zippers were quickly picked from the woven jute bag",
  "We promptly judged antique ivory buckles for the next prize",
  "Just keep examining every low bid quoted for zinc etchings",
  "How quickly daft jumping zebras vex",
  "Crazy Fredrick bought many very exquisite opal jewels",
  "The quick onyx goblin jumps over the lazy dwarf",
  "Fix problem quickly with galvanized jets",
];

function Leaderboard({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/scores/type').then(({ data }) => { setScores(data); setLoading(false); });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 420, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>⌨️ Type Racer — Top 10</span>
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
                <div style={{ fontWeight: 700, color: i === 0 ? '#ffd700' : 'var(--white)', fontSize: 15 }}>{s.score} WPM</div>
                {s.meta?.accuracy && <div style={{ fontSize: 11, color: 'var(--gray-2)' }}>{s.meta.accuracy}% acc</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TypeRacer({ onClose }) {
  const [sentence, setSentence] = useState('');
  const [input, setInput] = useState('');
  const [gameState, setGameState] = useState('idle');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const inputRef = useRef(null);

  const startGame = () => {
    const s = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    setSentence(s); setInput(''); setErrors(0); setWpm(0); setAccuracy(100); setStartTime(null);
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    if (!startTime && val.length > 0) setStartTime(Date.now());
    setInput(val);
    let errs = 0;
    for (let i = 0; i < val.length; i++) { if (val[i] !== sentence[i]) errs++; }
    setErrors(errs);
    const acc = val.length > 0 ? Math.round(((val.length - errs) / val.length) * 100) : 100;
    setAccuracy(acc);
    if (val === sentence) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const words = sentence.split(' ').length;
      const finalWpm = Math.round(words / elapsed);
      setWpm(finalWpm);
      setGameState('done');
      api.post('/api/scores', { game: 'type', score: finalWpm, meta: { accuracy: acc, errors: errs } }).catch(() => {});
    }
  };

  const getCharClass = (index) => {
    if (index >= input.length) return 'pending';
    return input[index] === sentence[index] ? 'correct' : 'wrong';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-raised)', border: 'var(--border-bright)', borderRadius: 16, width: 680, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⌨️</span>
            <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: 15 }}>Type Racer</span>
          </div>
          {gameState === 'playing' && (
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span style={{ color: 'var(--gray-4)' }}>Errors: <strong style={{ color: errors > 0 ? '#f23f43' : '#23a55a' }}>{errors}</strong></span>
              <span style={{ color: 'var(--gray-4)' }}>Accuracy: <strong style={{ color: accuracy >= 90 ? '#23a55a' : accuracy >= 70 ? '#f0b132' : '#f23f43' }}>{accuracy}%</strong></span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', color: 'var(--gray-3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>🏆 Leaderboard</button>
            <button onClick={onClose} style={{ background: 'var(--bg-float)', border: 'none', color: 'var(--gray-3)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 32 }}>
          {gameState === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 48 }}>⌨️</div>
              <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Type Racer</h2>
              <p style={{ color: 'var(--gray-3)', fontSize: 14, textAlign: 'center', maxWidth: 340 }}>Type the sentence as fast and accurately as you can. Your WPM gets saved to the leaderboard!</p>
              <button onClick={startGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>Start</button>
            </div>
          )}

          {gameState === 'playing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 10, padding: '20px 24px', fontSize: 20, lineHeight: 1.8, letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                {sentence.split('').map((char, i) => (
                  <span key={i} style={{ color: getCharClass(i) === 'correct' ? '#23a55a' : getCharClass(i) === 'wrong' ? '#f23f43' : 'var(--gray-3)', background: i === input.length ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: 2 }}>{char}</span>
                ))}
              </div>
              <input ref={inputRef} value={input} onChange={handleInput} style={{ background: 'var(--bg-float)', border: errors > 0 ? '1px solid #f23f43' : 'var(--border-bright)', borderRadius: 8, padding: '12px 16px', fontSize: 16, color: 'var(--white)', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.15s' }} placeholder="Start typing..." spellCheck={false} autoComplete="off" />
            </div>
          )}

          {gameState === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 48 }}>🏆</div>
              <h2 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 700 }}>Nice work!</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', marginTop: 8 }}>
                {[
                  { label: 'WPM', value: wpm, color: wpm >= 80 ? '#23a55a' : wpm >= 50 ? '#f0b132' : '#f23f43' },
                  { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 95 ? '#23a55a' : accuracy >= 80 ? '#f0b132' : '#f23f43' },
                  { label: 'Errors', value: errors, color: errors === 0 ? '#23a55a' : errors <= 3 ? '#f0b132' : '#f23f43' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
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
      </div>
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}