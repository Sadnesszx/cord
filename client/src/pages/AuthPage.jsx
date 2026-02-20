import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './Auth.css';
import WarningModal from '../components/ui/WarningModal';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [warning, setWarning] = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'register') {
  if (form.username.length < 3) return setError('Username must be at least 3 characters');
  if (!/^[a-zA-Z0-9]+$/.test(form.username)) return setError('Username can only contain letters and numbers');
}
    try {
      const { data } = await api.post(`/api/auth/${mode}`, {
  username: form.username,
  password: form.password,
});
login(data.token, data.user);
if (data.user.warning) {
  setWarning(data.user.warning);
} else {
  navigate('/');
}
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      <div className="auth-card fade-in">
        <div className="auth-logo">
          <img src="/favicon.png" alt="SadLounge" className="auth-logo-icon" />
          <span>SadLounge</span>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Join SadLounge'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Good to see you again.' : 'Pick your username and start chatting.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handle}
              placeholder="yourname"
              autoComplete="username"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button
            className="auth-switch-btn"
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>

{warning && (
  <WarningModal
    message={warning}
    onClose={() => { setWarning(''); navigate('/'); }}
  />
)}

    </div>
  );
}
