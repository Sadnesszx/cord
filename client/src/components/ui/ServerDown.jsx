export default function ServerDown() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      zIndex: 9999,
    }}>
      <img src="/favicon.png" alt="SadnessChat" style={{ width: 72, height: 72, borderRadius: 16, opacity: 0.8 }} />
      <h1 style={{ fontFamily: 'monospace', fontSize: 20, color: '#e8e8e8', letterSpacing: 2 }}>SadnessChat</h1>
      <p style={{ fontSize: 14, color: '#888', fontFamily: 'sans-serif', textAlign: 'center' }}>
        SadnessChat is currently down and will be back up soon.
      </p>
      <p style={{ fontSize: 12, color: '#444', fontFamily: 'monospace' }}>Thanks for your patience.</p>
    </div>
  );
}