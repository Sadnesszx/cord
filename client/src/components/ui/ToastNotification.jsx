import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import './ToastNotification.css';

export default function ToastNotification() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);

  const playToastSound = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = 600;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
};

  useEffect(() => {
    if (user?.username !== 'Sadness') return;
    const socket = getSocket();

    const onNewUser = ({ username }) => {
  const id = Date.now();
  playToastSound();
  setToasts(prev => [...prev, { id, username }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 6000);
};

    socket.on('new_user', onNewUser);
    return () => socket.off('new_user', onNewUser);
  }, [user?.username]);

  if (user?.username !== 'Sadness') return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span className="toast-icon">🎉</span>
          <div className="toast-text">
            <span className="toast-title">New Member!</span>
            <span className="toast-msg"><strong>{t.username}</strong> has just joined us!</span>
          </div>
          <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}