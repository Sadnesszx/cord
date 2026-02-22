import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function InvitePage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('joining');

  useEffect(() => {
    if (!user) { navigate(`/?redirect=/invite/${code}`); return; }
    api.post(`/api/servers/invite/${code}/join`)
      .then(() => { setStatus('success'); setTimeout(() => navigate('/'), 2000); })
      .catch(() => { setStatus('error'); setTimeout(() => navigate('/'), 2000); });
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, color: '#e8e8e8', fontFamily: 'monospace'
    }}>
      <img src="/favicon.png" alt="SadLounge" style={{ width: 64, height: 64, borderRadius: 16 }} />
      {status === 'joining' && <p>Joining server...</p>}
      {status === 'success' && <p style={{ color: '#23a55a' }}>✓ Joined! Redirecting...</p>}
      {status === 'error' && <p style={{ color: '#f23f43' }}>✕ Invalid or expired invite.</p>}
    </div>
  );
}