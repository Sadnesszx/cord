import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './Auth.css';
import WarningModal from '../components/ui/WarningModal';
import TOSPage from '../components/chat/TOSPage';
import PrivacyPolicy from '../components/chat/PrivacyPolicy';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', birthday: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [warning, setWarning] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [showTOS, setShowTOS] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      if (form.username.length < 3) { setLoading(false); return setError('Username must be at least 3 characters'); }
      if (!/^[a-zA-Z0-9]+$/.test(form.username)) { setLoading(false); return setError('Username can only contain letters and numbers'); }
      if (!form.birthday) { setLoading(false); return setError('Please enter your birthday'); }

      // Age check - must be at least 13
      const today = new Date();
      const birth = new Date(form.birthday);
      const age = today.getFullYear() - birth.getFullYear() - (
        today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
      );
      if (age < 13) { setLoading(false); return setError('You must be at least 13 years old to register'); }

      if (!tosAccepted) {
        setLoading(false);
        setPendingSubmit(true);
        setShowTOS(true);
        return;
      }
    }

    try {
      const { data } = await api.post(`/api/auth/${mode}`, {
        username: form.username,
        password: form.password,
        birthday: form.birthday || null,
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
          <img src="/favicon.png" alt="NihilisticChat" className="auth-logo-icon" />
          <span>NihilisticChat</span>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Join NihilisticChat'}
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

          {mode === 'register' && (
            <div className="auth-field">
              <label>Birthday</label>
              <input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={handle}
                min="1946-01-01"
                max="2025-12-31"
                required
              />
            </div>
          )}

          {mode === 'register' && (
  <p style={{ fontSize: 12, color: '#888', margin: '-4px 0 4px' }}>
    By registering you agree to our{' '}
    <button type="button" onClick={() => setShowTOS(true)} style={{ background: 'none', border: 'none', color: '#5865f2', cursor: 'pointer', fontSize: 12, padding: 0 }}>
      Terms of Service
    </button>
    {' '}and{' '}
    <button type="button" onClick={() => setShowPrivacy(true)} style={{ background: 'none', border: 'none', color: '#5865f2', cursor: 'pointer', fontSize: 12, padding: 0 }}>
      Privacy Policy
    </button>
  </p>
)}

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

      {showTOS && (
        <TOSPage onClose={() => {
          setShowTOS(false);
          setPendingSubmit(false);
        }} onAccept={() => {
          setTosAccepted(true);
          setShowTOS(false);
        }} />
      )}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}