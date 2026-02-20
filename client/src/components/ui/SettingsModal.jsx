import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './SettingsModal.css';

const COLORS = [
  { color: '#555', label: 'Ash' },
  { color: '#3d3d3d', label: 'Charcoal' },
  { color: '#7a3030', label: 'Crimson' },
  { color: '#6b2737', label: 'Wine' },
  { color: '#2d5a3d', label: 'Forest' },
  { color: '#2d4a2d', label: 'Moss' },
  { color: '#2d3d5a', label: 'Navy' },
  { color: '#2d5a5a', label: 'Teal' },
  { color: '#5a2d5a', label: 'Plum' },
  { color: '#5a4a2d', label: 'Bronze' },
];

export default function SettingsModal({ onClose }) {
  const { user, login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState(user?.avatar_color || '#555');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const showMsg = (m, isError = false) => {
    if (isError) setError(m);
    else setMsg(m);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const saveAvatar = async () => {
    try {
      await api.patch('/api/users/me/avatar', { avatar_color: selectedColor });
      const token = localStorage.getItem('sadlounge_token');
      login(token, { ...user, avatar_color: selectedColor });
      showMsg('Avatar updated!');
    } catch (err) {
      showMsg('Error updating avatar', true);
    }
  };

  const saveBio = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/api/users/me/bio', { bio });
      showMsg('Bio updated!');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', true);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (password !== confirm) return showMsg("Passwords don't match", true);
    if (password.length < 4) return showMsg('Password must be at least 4 characters', true);
    setSaving(true);
    try {
      await api.patch('/api/users/me/password', { password });
      showMsg('Password updated!');
      setPassword(''); setConfirm('');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', true);
    } finally { setSaving(false); }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-profile-preview">
          <div className="settings-avatar" style={{ background: selectedColor }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="settings-username">{user?.username}</span>
        </div>

        <div className="settings-section">
          <p className="settings-label">Avatar Color</p>
          <div className="settings-colors">
            {COLORS.map(({ color, label }) => (
              <button
                key={color}
                className={`settings-color-swatch ${selectedColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedColor(color)}
                title={label}
              />
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveAvatar}>
            Save Avatar
          </button>
        </div>

        <div className="settings-section">
          <p className="settings-label">Bio</p>
          <form onSubmit={saveBio}>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              maxLength={200}
              rows={3}
            />
            <p className="settings-char-count">{bio.length}/200</p>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Bio</button>
          </form>
        </div>

        <div className="settings-section">
          <p className="settings-label">Change Password</p>
          <form onSubmit={savePassword}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={saving}>
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>

        {error && <p className="settings-error">{error}</p>}
        {msg && <p className="settings-success">{msg}</p>}

        <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}