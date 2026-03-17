import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './SettingsModal.css';
import ImageCropper from './ImageCropper';
import { THEMES, saveTheme, loadSavedTheme } from '../../lib/theme';

function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/users/me/sessions').then(({ data }) => { setSessions(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const revoke = async (id) => {
    await api.delete(`/api/users/me/sessions/${id}`);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const revokeAll = async () => {
    await api.delete('/api/users/me/sessions');
    setSessions(prev => prev.slice(0, 1));
  };

  const formatUA = (ua) => {
    if (!ua) return 'Unknown device';
    if (ua.includes('Chrome')) return '🌐 Chrome';
    if (ua.includes('Firefox')) return '🦊 Firefox';
    if (ua.includes('Safari')) return '🧭 Safari';
    if (ua.includes('Edge')) return '🌀 Edge';
    return '🖥️ Browser';
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <p style={{ fontSize: 12, color: '#888' }}>Loading...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.length === 0 && <p style={{ fontSize: 12, color: '#888' }}>No active sessions found.</p>}
      {sessions.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 500 }}>
              {formatUA(s.user_agent)}
              {i === 0 && <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>current</span>}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Last seen {formatDate(s.last_seen)} {s.ip_address ? `• ${s.ip_address}` : ''}</div>
          </div>
          {i !== 0 && (
            <button onClick={() => revoke(s.id)} style={{ background: 'var(--danger-dim)', border: '1px solid rgba(237,66,69,0.2)', color: 'var(--danger)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Revoke</button>
          )}
        </div>
      ))}
      {sessions.length > 1 && (
        <button onClick={revokeAll} style={{ background: 'transparent', border: '1px solid rgba(237,66,69,0.3)', color: 'var(--danger)', borderRadius: 8, padding: '6px', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
          Log out all other sessions
        </button>
      )}
    </div>
  );
}

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
  const [cropSrc, setCropSrc] = useState(null);
  const [selectedBanner, setSelectedBanner] = useState(user?.banner_color || '#1a1a1a');
  const [selectedStatus, setSelectedStatus] = useState(user?.status || 'online');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saved = loadSavedTheme();
  const [selectedTheme, setSelectedTheme] = useState(saved.themeId || 'dark');
  const [customBg, setCustomBg] = useState(saved.customBg || '');
  const [customBgInput, setCustomBgInput] = useState(saved.customBg || '');

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
    } catch (err) { showMsg('Error updating avatar', true); }
  };

  const saveBanner = async () => {
    try {
      await api.patch('/api/users/me/banner', { banner_color: selectedBanner });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, banner_color: selectedBanner });
      showMsg('Banner updated!');
    } catch (err) { showMsg('Error updating banner', true); }
  };

  const saveStatus = async () => {
    try {
      await api.patch('/api/users/me/status', { status: selectedStatus, custom_status: customStatus });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, status: selectedStatus, custom_status: customStatus });
      showMsg('Status updated!');
    } catch (err) { showMsg('Error updating status', true); }
  };

  const uploadProfilePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showMsg('Image must be under 10MB', true);
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = async (blob) => {
    setCropSrc(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', blob, 'avatar.png');
      const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
      const data = await res.json();
      const url = data.data.url;
      await api.patch('/api/users/avatar-image', { avatar_url: url });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, avatar_url: url });
      showMsg('Profile picture updated!');
    } catch (err) { showMsg('Error uploading photo', true); }
    finally { setUploadingPhoto(false); }
  };

  const removeProfilePicture = async () => {
    try {
      await api.patch('/api/users/avatar-image', { avatar_url: null });
      const token = localStorage.getItem('nihilisticchat_token');
      login(token, { ...user, avatar_url: null });
      showMsg('Profile picture removed!');
    } catch (err) { showMsg('Error removing photo', true); }
  };

  const saveBio = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/api/users/me/bio', { bio });
      showMsg('Bio updated!');
    } catch (err) { showMsg(err.response?.data?.error || 'Error', true); }
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
    } catch (err) { showMsg(err.response?.data?.error || 'Error', true); }
    finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText !== user?.username) return showMsg('Username does not match', true);
    setDeleting(true);
    try {
      await api.delete('/api/users/me');
      logout();
    } catch (err) { showMsg(err.response?.data?.error || 'Error deleting account', true); }
    finally { setDeleting(false); }
  };

  const applyThemeChoice = (themeId) => {
    setSelectedTheme(themeId);
    saveTheme(themeId, customBg || null);
    showMsg('Theme applied!');
  };

  const applyCustomBg = () => {
    const url = customBgInput.trim();
    setCustomBg(url);
    saveTheme(selectedTheme, url || null);
    showMsg(url ? 'Background applied!' : 'Background removed!');
  };

  const uploadBgImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showMsg('Image must be under 10MB', true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
      const data = await res.json();
      const url = data.data.url;
      setCustomBgInput(url);
      setCustomBg(url);
      saveTheme(selectedTheme, url);
      showMsg('Background applied!');
    } catch (err) { showMsg('Error uploading image', true); }
    e.target.value = '';
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
            {user?.avatar_url && <button className="btn-ghost" onClick={removeProfilePicture}>Remove</button>}
          </div>
        </div>

        <div className="settings-section">
          <p className="settings-label">Avatar Color</p>
          <div className="settings-colors">
            {COLORS.map(({ color, label }) => (
              <button key={color} className={`settings-color-swatch ${selectedColor === color ? 'active' : ''}`} style={{ background: color }} onClick={() => setSelectedColor(color)} title={label} />
            ))}
          </div>
          <div className="settings-section">
            <p className="settings-label">Banner Color</p>
            <div className="settings-colors">
              {BANNER_COLORS.map(({ color, label }) => (
                <button key={color} className={`settings-color-swatch ${selectedBanner === color ? 'active' : ''}`} style={{ background: color, border: '1px solid #333' }} onClick={() => setSelectedBanner(color)} title={label} />
              ))}
            </div>
            <div className="settings-section">
              <p className="settings-label">Status</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => setSelectedStatus(s.value)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: selectedStatus === s.value ? '#2a2a2a' : '#1a1a1a', border: selectedStatus === s.value ? '1px solid #5865f2' : '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#e8e8e8' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                    {s.label}
                  </button>
                ))}
              </div>
              <input style={{ marginTop: 10, width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13 }} value={customStatus} onChange={e => setCustomStatus(e.target.value)} placeholder="Custom status (optional)" maxLength={60} />
              <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveStatus}>Save Status</button>
            </div>
            <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveBanner}>Save Banner</button>
          </div>
          <button className="btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={saveAvatar}>Save Avatar Color</button>
        </div>

        <div className="settings-section">
          <p className="settings-label">Theme</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={() => applyThemeChoice(t.id)} style={{ padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: selectedTheme === t.id ? 'var(--accent-dim)' : '#1a1a1a', border: selectedTheme === t.id ? '1px solid var(--accent)' : '1px solid #2a2a2a', color: '#e8e8e8', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.name}
              </button>
            ))}
          </div>
          <p className="settings-label" style={{ marginBottom: 6 }}>Custom Background</p>
          <p style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Upload an image or paste a URL — it appears as a wallpaper behind the chat.</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={customBgInput} onChange={e => setCustomBgInput(e.target.value)} placeholder="Paste image URL..." style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#e8e8e8', fontSize: 12 }} />
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }} onClick={applyCustomBg}>Apply</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <label className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px', cursor: 'pointer', border: '1px solid #2a2a2a', borderRadius: 8, flex: 1, textAlign: 'center' }}>
              📁 Upload Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadBgImage} />
            </label>
            {customBg && (
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px', border: '1px solid #f23f43', color: '#f23f43', borderRadius: 8 }} onClick={() => { setCustomBg(''); setCustomBgInput(''); saveTheme(selectedTheme, null); showMsg('Background removed!'); }}>
                Remove
              </button>
            )}
          </div>
          {customBg && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 60, position: 'relative' }}>
              <img src={customBg} alt="bg preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>Preview</div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <p className="settings-label">Bio</p>
          <form onSubmit={saveBio}>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself..." maxLength={200} rows={3} />
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
          <p className="settings-label">Sessions</p>
          <SessionManager />
        </div>

        <div className="settings-section">
          <p className="settings-label">Export Data</p>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Download all your messages and account data as a JSON file.</p>
          <a href={`${import.meta.env.VITE_API_URL}/api/users/me/export`}
            style={{ display: 'block', textAlign: 'center', background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 8, padding: '8px', color: 'var(--gray-4)', fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}
            target="_blank" rel="noreferrer">
            📦 Download My Data
          </a>
        </div>

        <div className="settings-section">
          <p className="settings-label" style={{ color: '#f23f43' }}>Danger Zone</p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%', padding: '8px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid #f23f43', color: '#f23f43', fontSize: 13 }}>
              Delete Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>
                This is permanent and cannot be undone. Type your username <strong style={{ color: '#e8e8e8' }}>{user?.username}</strong> to confirm.
              </p>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={`Type "${user?.username}" to confirm`} style={{ background: '#1a1a1a', border: '1px solid #f23f43', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button onClick={deleteAccount} disabled={deleteConfirmText !== user?.username || deleting} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', background: deleteConfirmText === user?.username ? '#f23f43' : '#3a1a1a', border: 'none', color: '#fff', fontSize: 13 }}>
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
      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCropDone} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}