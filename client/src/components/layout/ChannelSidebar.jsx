import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ChannelSidebar.css';
import ConfirmModal from '../ui/ConfirmModal';

export default function ChannelSidebar({ server, activeChannel, onSelectChannel, onServerDeleted, onServerRenamed }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const isOwner = server?.owner_id === user?.id;
  const [confirm, setConfirm] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    if (!server) { setChannels([]); setCategories([]); return; }
    api.get(`/api/servers/${server.id}/channels`).then(({ data }) => {
      const cats = data.categories || [];
      const chans = data.channels || data;
      setCategories(cats);
      setChannels(Array.isArray(data) ? data : chans);
      const allChans = Array.isArray(data) ? data : chans;
      if (allChans.length > 0) onSelectChannel(allChans[0]);
    });
  }, [server?.id]);

  const createChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    const { data } = await api.post(`/api/servers/${server.id}/channels`, {
      name: newChannel.trim(),
      categoryId: newChannelCategory || null,
    });
    setChannels([...channels, data]);
    onSelectChannel(data);
    setNewChannel('');
    setNewChannelCategory('');
    setShowCreate(false);
  };

  const createCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const { data } = await api.post(`/api/servers/${server.id}/categories`, { name: newCategory.trim() });
    setCategories([...categories, data]);
    setNewCategory('');
    setShowCreateCategory(false);
  };

  const deleteChannel = (channelId) => {
    setConfirm({
      message: 'Delete this channel? This cannot be undone!',
      action: async () => {
        await api.delete(`/api/servers/${server.id}/channels/${channelId}`);
        const updated = channels.filter(c => c.id !== channelId);
        setChannels(updated);
        if (activeChannel?.id === channelId) onSelectChannel(updated[0] || null);
        setConfirm(null);
      }
    });
  };

  const deleteCategory = (categoryId) => {
    setConfirm({
      message: 'Delete this category? Channels inside will become uncategorized.',
      action: async () => {
        await api.delete(`/api/servers/${server.id}/categories/${categoryId}`);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setChannels(prev => prev.map(ch => ch.category_id === categoryId ? { ...ch, category_id: null } : ch));
        setConfirm(null);
      }
    });
  };

  const deleteServer = () => {
    setConfirm({
      message: `Delete "${server.name}"? This cannot be undone!`,
      action: async () => {
        await api.delete(`/api/servers/${server.id}`);
        onServerDeleted(server.id);
        setConfirm(null);
      }
    });
  };

  const leaveServer = () => {
    setConfirm({
      message: `Leave "${server.name}"?`,
      action: async () => {
        await api.post(`/api/servers/${server.id}/leave`);
        onServerDeleted(server.id);
        setConfirm(null);
      }
    });
  };

  const renameServer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data } = await api.patch(`/api/servers/${server.id}/rename`, { name: newName.trim() });
    onServerRenamed(data);
    setNewName('');
    setShowRename(false);
  };

  const generateInvite = async () => {
    try {
      const { data } = await api.post(`/api/servers/${server.id}/invite`);
      setInviteCode(data.code);
      setShowInvite(true);
    } catch (err) { console.error(err); }
  };

  const uploadServerIcon = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('Image must be under 5MB');
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=4e1a8e9f7f45de208e0ef1b1d36b91a5`, { method: 'POST', body: formData });
      const imgData = await res.json();
      const url = imgData.data.url;
      await api.patch(`/api/servers/${server.id}/icon`, { icon_url: url });
      onServerRenamed({ ...server, icon_url: url });
    } catch (err) { console.error(err); alert('Failed to upload icon'); }
    finally { setUploadingIcon(false); }
  };

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;

  // Group channels by category
  const uncategorized = channels.filter(ch => !ch.category_id);
  const getChannelsForCategory = (catId) => channels.filter(ch => ch.category_id === catId);

  const renderChannel = (ch) => (
    <div key={ch.id} className={`channel-item-wrapper ${activeChannel?.id === ch.id ? 'active' : ''}`}>
      <button className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`} onClick={() => onSelectChannel(ch)}>
        <span className="channel-hash">#</span>
        <span className="channel-name">{ch.name}</span>
      </button>
      {isOwner && (
        <button className="channel-delete-btn" onClick={() => deleteChannel(ch.id)} title="Delete channel">✕</button>
      )}
    </div>
  );

  return (
    <div className="channel-sidebar">
      {server && (
        <div className="channel-header">
          <div className="channel-server-top">
            {isOwner ? (
              <label className="server-icon-upload" title="Change server icon">
                {server.icon_url ? <img src={server.icon_url} alt={server.name} className="server-icon-img" /> : <div className="server-icon-placeholder">{server.name.slice(0, 2).toUpperCase()}</div>}
                <div className="server-icon-overlay">{uploadingIcon ? '...' : '📷'}</div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadServerIcon} disabled={uploadingIcon} />
              </label>
            ) : (
              server.icon_url ? <img src={server.icon_url} alt={server.name} className="server-icon-img" /> : <div className="server-icon-placeholder">{server.name.slice(0, 2).toUpperCase()}</div>
            )}
            <span className="channel-server-name">{server.name}</span>
          </div>

          <button className="channel-invite-btn" onClick={generateInvite} title="Invite people">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:4}}><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
            Invite
          </button>
          {isOwner && (
            <>
              <button className="channel-rename-server" onClick={() => setShowRename(!showRename)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:4}}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Rename
              </button>
              <button className="channel-delete-server" onClick={deleteServer}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:4}}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                Delete Server
              </button>
            </>
          )}
          {!isOwner && (
            <button className="channel-leave-server" onClick={leaveServer}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:4}}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
              Leave Server
            </button>
          )}
          {showRename && (
            <form onSubmit={renameServer} className="channel-rename-form">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New server name" autoFocus />
              <div className="channel-create-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowRename(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Rename</button>
              </div>
            </form>
          )}
          {showInvite && inviteCode && (
            <div className="invite-box">
              <p style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Share this link — expires in 7 days:</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input readOnly value={inviteUrl} style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: 6, padding: '6px 8px', color: '#e8e8e8', fontSize: 12 }} onClick={e => e.target.select()} />
                <button className="btn-primary" style={{ fontSize: 12, padding: '6px 10px' }}
                  onClick={(e) => {
                    navigator.clipboard.writeText(inviteUrl).catch(() => { const el = document.createElement('textarea'); el.value = inviteUrl; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); });
                    e.target.textContent = 'Copied!';
                    setTimeout(() => e.target.textContent = 'Copy', 2000);
                  }}>Copy</button>
              </div>
              <button className="btn-ghost" style={{ marginTop: 6, width: '100%', fontSize: 12 }} onClick={() => setShowInvite(false)}>Close</button>
            </div>
          )}
        </div>
      )}

      <div className="channel-list">
        {!server && <div className="channel-empty-state"><p>Select a server from the top bar</p></div>}

        {server && (
          <>
            {/* Categories */}
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="channel-section-label" style={{ cursor: 'pointer' }} onClick={() => toggleCollapse(cat.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--gray-2)', transition: 'transform 0.15s', display: 'inline-block', transform: collapsed[cat.id] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    {cat.name}
                  </span>
                  {isOwner && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="channel-add-btn" onClick={e => { e.stopPropagation(); setNewChannelCategory(cat.id); setShowCreate(true); }} title="Add channel to category">+</button>
                      <button className="channel-add-btn" onClick={e => { e.stopPropagation(); deleteCategory(cat.id); }} title="Delete category" style={{ color: 'var(--danger)', opacity: 0.6 }}>✕</button>
                    </div>
                  )}
                </div>
                {!collapsed[cat.id] && getChannelsForCategory(cat.id).map(renderChannel)}
              </div>
            ))}

            {/* Uncategorized channels */}
            <div className="channel-section-label">
              <span>Channels</span>
              {isOwner && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="channel-add-btn" onClick={() => { setNewChannelCategory(''); setShowCreate(!showCreate); }} title="Add channel">+</button>
                  <button className="channel-add-btn" onClick={() => setShowCreateCategory(!showCreateCategory)} title="Add category" style={{ fontSize: 10 }}>📁</button>
                </div>
              )}
            </div>

            {uncategorized.map(renderChannel)}

            {showCreate && (
              <form className="channel-create-form" onSubmit={createChannel}>
                <input value={newChannel} onChange={e => setNewChannel(e.target.value)} placeholder="new-channel" autoFocus />
                {categories.length > 0 && (
                  <select value={newChannelCategory} onChange={e => setNewChannelCategory(e.target.value)} style={{ background: 'var(--bg-float)', border: 'var(--border-bright)', borderRadius: 6, padding: '6px 8px', color: 'var(--white)', fontSize: 12, marginTop: 4 }}>
                    <option value="">No category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <div className="channel-create-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            )}

            {showCreateCategory && (
              <form className="channel-create-form" onSubmit={createCategory}>
                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category name" autoFocus />
                <div className="channel-create-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowCreateCategory(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
    </div>
  );
}