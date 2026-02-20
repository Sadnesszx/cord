import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import './ToastNotification.css';

export default function ToastNotification() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (user?.username !== 'Sadness') return;
    const socket = getSocket();

    socket.on('new_user', ({ username }) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, username }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    });

    return () => socket.off('new_user');
  }, [user]);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span className="toast-icon">👤</span>
          <div className="toast-text">
            <span className="toast-title">New User!</span>
            <span className="toast-msg">{t.username} just registered</span>
          </div>
          <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}