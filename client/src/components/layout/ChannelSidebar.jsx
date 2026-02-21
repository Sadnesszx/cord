import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import './ChannelSidebar.css';
import ConfirmModal from '../ui/ConfirmModal';

export default function ChannelSidebar({ server, activeChannel, onSelectChannel, onServerDeleted, onServerRenamed }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const isOwner = server?.owner_id === user?.id;
  const [confirm, setConfirm] = useState(null); // { message, action }
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');

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

  return (
    <div className="channel-sidebar">
      {server && (
  <div className="channel-header">
    <span className="channel-server-name">{server.name}</span>

    {isOwner && (
      <>
        <button className="channel-rename-server" onClick={() => setShowRename(!showRename)}>
          ✏️ Rename
        </button>
        <button className="channel-delete-server" onClick={deleteServer}>
          🗑 Delete Server
        </button>
      </>
    )}
    {!isOwner && (
      <button className="channel-leave-server" onClick={leaveServer}>
        🚪 Leave Server
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
              {isOwner && (
                <button className="channel-add-btn" onClick={() => setShowCreate(!showCreate)}>+</button>
              )}
            </div>

            {channels.map((ch) => (
              <div key={ch.id} className={`channel-item-wrapper ${activeChannel?.id === ch.id ? 'active' : ''}`}>
                <button
                  className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`}
                  onClick={() => onSelectChannel(ch)}
                >
                  <span className="channel-hash">#</span>
                  <span className="channel-name">{ch.name}</span>
                </button>
                {isOwner && (
                  <button className="channel-delete-btn" onClick={() => deleteChannel(ch.id)} title="Delete channel">✕</button>
                )}
              </div>
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
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}