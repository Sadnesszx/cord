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

const BANNER_COLORS = [
  { color: '#5865f2', label: 'Blurple' },
  { color: '#eb459e', label: 'Pink' },
  { color: '#ed4245', label: 'Red' },
  { color: '#f0b132', label: 'Yellow' },
  { color: '#23a55a', label: 'Green' },
  { color: '#3ba1cc', label: 'Blue' },
  { color: '#9b59b6', label: 'Purple' },
  { color: '#e67e22', label: 'Orange' },
  { color: '#1abc9c', label: 'Teal' },
  { color: '#e91e63', label: 'Rose' },
];

const STATUSES = [
  { value: 'online', label: 'Online', color: '#23a55a' },
  { value: 'idle', label: 'Idle', color: '#f0b132' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f23f43' },
  { value: 'invisible', label: 'Invisible', color: '#80848e' },
];

export default function SettingsModal({ onClose }) {
  const { user, login, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState('');
  const [selectedColor, setSelectedColor] = useState(user?.avatar_color || '#555');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(user?.banner_color || '#1a1a1a');
  const [selectedStatus, setSelectedStatus] = useState(user?.status || 'online');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const showMsg = (m, isError = false) => {
    if (isError) setError(m);
    else setMsg(m);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const saveAvatar = async () => {
    try {
      await api.patch('/api/users/me/avatar', { avatar_color: selectedColor });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, avatar_color: selectedColor });
      showMsg('Avatar updated!');
    } catch (err) {
      showMsg('Error updating avatar', true);
    }
  };

  const saveBanner = async () => {
    try {
      await api.patch('/api/users/me/banner', { banner_color: selectedBanner });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, banner_color: selectedBanner });
      showMsg('Banner updated!');
    } catch (err) {
      showMsg('Error updating banner', true);
    }
  };

  const saveStatus = async () => {
    try {
      await api.patch('/api/users/me/status', { status: selectedStatus, custom_status: customStatus });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, status: selectedStatus, custom_status: customStatus });
      showMsg('Status updated!');
    } catch (err) {
      showMsg('Error updating status', true);
    }
  };

  const uploadProfilePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showMsg('Image must be under 5MB', true);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const url = data.data.url;
      await api.patch('/api/users/avatar-image', { avatar_url: url });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, avatar_url: url });
      showMsg('Profile picture updated!');
    } catch (err) {
      showMsg('Error uploading photo', true);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      await api.patch('/api/users/avatar-image', { avatar_url: null });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, avatar_url: null });
      showMsg('Profile picture removed!');
    } catch (err) {
      showMsg('Error removing photo', true);
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

  const deleteAccount = async () => {
    if (deleteConfirmText !== user?.username) return showMsg('Username does not match', true);
    setDeleting(true);
    try {
      await api.delete('/api/users/me');
      logout();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error deleting account', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-profile-preview">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="settings-avatar-img" />
          ) : (
            <div className="settings-avatar" style={{ background: selectedColor }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="settings-username">{user?.username}</span>
        </div>

        <div className="settings-section">
          <p className="settings-label">Profile Picture</p>
          <div className="settings-photo-row">
            <label className="btn-primary settings-upload-btn">
              {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProfilePicture} disabled={uploadingPhoto} />
            </label>
            {user?.avatar_url && (
              <button className="btn-ghost" onClick={removeProfilePicture}>Remove</button>
            )}
          </div>
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

          <div className="settings-section">
            <p className="settings-label">Banner Color</p>
            <div className="settings-colors">
              {BANNER_COLORS.map(({ color, label }) => (
                <button
                  key={color}
                  className={`settings-color-swatch ${selectedBanner === color ? 'active' : ''}`}
                  style={{ background: color, border: '1px solid #333' }}
                  onClick={() => setSelectedBanner(color)}
                  title={label}
                />
              ))}
            </div>

            <div className="settings-section">
              <p className="settings-label">Status</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedStatus(s.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: selectedStatus === s.value ? '#2a2a2a' : '#1a1a1a',
                      border: selectedStatus === s.value ? '1px solid #5865f2' : '1px solid #2a2a2a',
                      borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#e8e8e8',
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                style={{ marginTop: 10, width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13 }}
                value={customStatus}
                onChange={e => setCustomStatus(e.target.value)}
                placeholder="Custom status (optional)"
                maxLength={60}
              />
              <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveStatus}>
                Save Status
              </button>
            </div>
            <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveBanner}>
              Save Banner
            </button>
          </div>
          <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveAvatar}>
            Save Avatar Color
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

        <div className="settings-section">
          <p className="settings-label" style={{ color: '#f23f43' }}>Danger Zone</p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%', padding: '8px', borderRadius: 8, cursor: 'pointer',
                background: 'transparent', border: '1px solid #f23f43',
                color: '#f23f43', fontSize: 13,
              }}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>
                This is permanent and cannot be undone. Type your username <strong style={{ color: '#e8e8e8' }}>{user?.username}</strong> to confirm.
              </p>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${user?.username}" to confirm`}
                style={{ background: '#1a1a1a', border: '1px solid #f23f43', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirmText !== user?.username || deleting}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    background: deleteConfirmText === user?.username ? '#f23f43' : '#3a1a1a',
                    border: 'none', color: '#fff', fontSize: 13,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="settings-error">{error}</p>}
        {msg && <p className="settings-success">{msg}</p>}

        <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}