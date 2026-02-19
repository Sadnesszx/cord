import { useState, useEffect } from 'react';
import api from '../../lib/api';
import './ServerSidebar.css';

export default function ServerSidebar({ activeServer, onSelectServer }) {
  const [servers, setServers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinId, setJoinId] = useState('');

  useEffect(() => {
    api.get('/api/servers').then(({ data }) => {
      setServers(data);
      if (data.length > 0 && !activeServer) onSelectServer(data[0]);
    });
  }, []);

  const createServer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data } = await api.post('/api/servers', { name: newName.trim() });
    setServers([...servers, data]);
    onSelectServer(data);
    setNewName('');
    setShowCreate(false);
  };

  const joinServer = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    try {
      const { data } = await api.post(`/api/servers/${joinId.trim()}/join`);
      if (!servers.find(s => s.id === data.id)) setServers([...servers, data]);
      onSelectServer(data);
      setJoinId('');
      setShowJoin(false);
    } catch {
      alert('Server not found');
    }
  };

  const getInitials = (name) => name.slice(0, 2).toUpperCase();

  return (
    <div className="server-rail">
      {/* Home */}
      <button
        className={`server-icon ${!activeServer ? 'active' : ''}`}
        onClick={() => onSelectServer(null)}
        title="Home"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </button>

      <div className="server-divider" />

      {servers.map((server) => (
        <button
          key={server.id}
          className={`server-icon ${activeServer?.id === server.id ? 'active' : ''}`}
          onClick={() => onSelectServer(server)}
          title={server.name}
        >
          {getInitials(server.name)}
        </button>
      ))}

      <div className="server-divider" />

      {/* Create server */}
      <button
        className="server-icon server-add"
        onClick={() => setShowCreate(!showCreate)}
        title="Create server"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>

      {/* Join server */}
      <button
        className="server-icon server-add"
        onClick={() => setShowJoin(!showJoin)}
        title="Join server"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </button>

      {/* Create modal */}
      {showCreate && (
        <div className="server-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="server-modal" onClick={e => e.stopPropagation()}>
            <h3>Create a server</h3>
            <form onSubmit={createServer}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="My awesome server"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="server-modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="server-modal" onClick={e => e.stopPropagation()}>
            <h3>Join a server</h3>
            <p className="modal-desc">Enter the server ID to join</p>
            <form onSubmit={joinServer}>
              <input
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                placeholder="Server ID"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
