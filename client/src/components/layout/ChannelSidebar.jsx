import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ChannelSidebar.css';

export default function ChannelSidebar({ server, activeChannel, onSelectChannel }) {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState('');

  useEffect(() => {
    if (!server) { setChannels([]); return; }
    api.get(`/api/servers/${server.id}/channels`).then(({ data }) => {
      setChannels(data);
      if (data.length > 0) onSelectChannel(data[0]);
    });
  }, [server?.id]);

  const createChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    const { data } = await api.post(`/api/servers/${server.id}/channels`, { name: newChannel.trim() });
    setChannels([...channels, data]);
    onSelectChannel(data);
    setNewChannel('');
    setShowCreate(false);
  };

  return (
    <div className="channel-sidebar">
      {server && (
        <div className="channel-header">
          <span className="channel-server-name">{server.name}</span>
        </div>
      )}

      <div className="channel-list">
        {!server && (
          <div className="channel-empty-state">
            <p>Select or create a server to get started</p>
          </div>
        )}

        {server && (
          <>
            <div className="channel-section-label">
              <span>Text Channels</span>
              {server.owner_id === user?.id && (
                <button
                  className="channel-add-btn"
                  onClick={() => setShowCreate(!showCreate)}
                  title="Create channel"
                >+</button>
              )}
            </div>

            {channels.map((ch) => (
              <button
                key={ch.id}
                className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`}
                onClick={() => onSelectChannel(ch)}
              >
                <span className="channel-hash">#</span>
                <span className="channel-name">{ch.name}</span>
              </button>
            ))}

            {showCreate && (
              <form className="channel-create-form" onSubmit={createChannel}>
                <input
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value)}
                  placeholder="new-channel"
                  autoFocus
                />
                <div className="channel-create-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* User panel at bottom */}
      <div className="user-panel">
        <div className="user-avatar" style={{ background: user?.avatar_color || '#9898b8' }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-status">
            <span className="status-dot" />
            Online
          </span>
        </div>
        <button className="logout-btn" onClick={logout} title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
