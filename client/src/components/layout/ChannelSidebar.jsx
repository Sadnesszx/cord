import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ChannelSidebar.css';

export default function ChannelSidebar({ server, activeChannel, onSelectChannel }) {
  const { user } = useAuth();
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
  <button
    className="channel-copy-id"
    onClick={() => {
      navigator.clipboard.writeText(server.id);
      alert('Server ID copied!');
    }}
    title="Copy server ID to invite friends"
  >
    Copy ID
  </button>
</div>
      )}

      <div className="channel-list">
        {!server && (
          <div className="channel-empty-state">
            <p>Select a server from the top bar</p>
          </div>
        )}

        {server && (
          <>
            <div className="channel-section-label">
              <span>Channels</span>
              {server.owner_id === user?.id && (
                <button className="channel-add-btn" onClick={() => setShowCreate(!showCreate)}>+</button>
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
    </div>
  );
}
