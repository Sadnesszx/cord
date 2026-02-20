import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './SettingsModal.css';

export default function SettingsModal({ onClose }) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const savePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (password !== confirm) return setError("Passwords don't match");
    if (password.length < 4) return setError('Password must be at least 4 characters');
    setSaving(true);
    try {
      await api.patch('/api/users/me/password', { password });
      setMsg('Password updated!');
      setPassword(''); setConfirm('');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const saveBio = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await api.patch('/api/users/me/bio', { bio });
      setMsg('Bio updated!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <h3>Settings</h3>

        <div className="settings-section">
          <p className="settings-label">Bio</p>
          <form onSubmit={saveBio}>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people a little about yourself..."
              maxLength={200}
              rows={3}
            />
            <p className="settings-char-count">{bio.length}/200</p>
            <div className="settings-actions">
              <button type="submit" className="btn-primary">Save Bio</button>
            </div>
          </form>
        </div>

        <div className="settings-section">
          <p className="settings-label">Change Password</p>
          <form onSubmit={savePassword}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
            {error && <p className="settings-error">{error}</p>}
            {msg && <p className="settings-success">{msg}</p>}
            <div className="settings-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Password'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}