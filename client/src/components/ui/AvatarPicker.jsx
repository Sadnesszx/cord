import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './AvatarPicker.css';

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

export default function AvatarPicker({ onClose }) {
  const { user, login } = useAuth();
  const [selected, setSelected] = useState(user?.avatar_color || '#555');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const saveAvatar = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me/avatar', { avatar_color: selected });
      const updatedUser = { ...user, avatar_color: selected };
      const token = localStorage.getItem('sadlounge_token');
      login(token, updatedUser);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveBio = async () => {
    try {
      await api.patch('/api/users/me/bio', { bio });
      setMsg('Bio saved!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me/avatar', { avatar_color: selected });
      if (bio.trim()) await api.patch('/api/users/me/bio', { bio });
      const updatedUser = { ...user, avatar_color: selected };
      const token = localStorage.getItem('sadlounge_token');
      login(token, updatedUser);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="avatar-picker-overlay" onClick={onClose}>
      <div className="avatar-picker" onClick={e => e.stopPropagation()}>
        <h3>Edit Profile</h3>

        <div className="avatar-preview">
          <div className="avatar-preview-circle" style={{ background: selected }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span>{user?.username}</span>
        </div>

        <p className="avatar-section-label">Avatar Color</p>
        <div className="avatar-colors">
          {COLORS.map(({ color, label }) => (
            <button
              key={color}
              className={`color-swatch ${selected === color ? 'active' : ''}`}
              style={{ background: color }}
              onClick={() => setSelected(color)}
              title={label}
            />
          ))}
        </div>

        <p className="avatar-section-label">Bio</p>
        <textarea
          className="avatar-bio-input"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell people about yourself..."
          maxLength={200}
          rows={3}
        />
        <p className="avatar-char-count">{bio.length}/200</p>
        {msg && <p className="avatar-msg">{msg}</p>}

        <div className="avatar-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}