import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChannelSidebar from '../components/layout/ChannelSidebar';
import FriendsSidebar from '../components/layout/FriendsSidebar';
import ChatArea from '../components/chat/ChatArea';
import DMArea from '../components/chat/DMArea';
import api from '../lib/api';
import AvatarPicker from '../components/ui/AvatarPicker';
import './AppLayout.css';
import HomePage from '../components/chat/HomePage';
import MembersSidebar from '../components/layout/MembersSidebar';
import ServerBrowser from '../components/ui/ServerBrowser';
import ToastNotification from '../components/ui/ToastNotification';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [servers, setServers] = useState([]);
  const [serversLoaded, setServersLoaded] = useState(false);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeFriend, setActiveFriend] = useState(null);
  const [view, setView] = useState('dms');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);

  const loadServers = () => {
    if (!serversLoaded) {
      api.get('/api/servers').then(({ data }) => {
        setServers(data);
        setServersLoaded(true);
      });
    }
  };

  const handleSelectServer = (server) => {
    setActiveServer(server);
    setActiveChannel(null);
    setActiveFriend(null);
    setView('servers');
  };

const handleDMs = () => {
  setView('dms');
  setActiveServer(null);
  setActiveChannel(null);
  setActiveFriend(null);
};

  const createServer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data } = await api.post('/api/servers', { name: newName.trim() });
    setServers([...servers, data]);
    handleSelectServer(data);
    setNewName('');
    setShowCreate(false);
  };

  const joinServer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/api/servers/${joinId.trim()}/join`);
      if (!servers.find(s => s.id === data.id)) setServers([...servers, data]);
      handleSelectServer(data);
      setJoinId('');
      setShowJoin(false);
    } catch { alert('Server not found'); }
  };

  // Load servers on mount
  useState(() => { loadServers(); }, []);

  return (
    <div className="app-layout">
      {/* TOP BAR */}
      <div className="top-bar">
        <span className="top-bar-logo" onClick={handleDMs} style={{ cursor: 'pointer' }}>SadLounge</span>

        <div className="top-bar-servers" onClick={loadServers}>
          <button
            className={`top-server-btn dm-btn ${view === 'dms' ? 'active' : ''}`}
            onClick={handleDMs}
          >
            DMs
          </button>

          {servers.map(s => (
            <button
              key={s.id}
              className={`top-server-btn ${activeServer?.id === s.id ? 'active' : ''}`}
              onClick={() => handleSelectServer(s)}
            >
              {s.name}
            </button>
          ))}

          <button className="top-bar-new-server" onClick={() => setShowCreate(true)}>+ New</button>
          <button className="top-bar-new-server" onClick={() => setShowBrowser(true)}>Browse</button>
        </div>

        <div className="top-bar-actions">
          <div className="top-bar-user" onClick={() => setShowAvatarPicker(true)} style={{cursor:"pointer"}} title="Change avatar">
            <div className="top-bar-avatar" style={{ background: user?.avatar_color || '#555' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="top-bar-username">{user?.username}</span>
            <button className="top-bar-logout" onClick={logout} title="Log out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* LEFT PANEL */}
      <div className="left-panel">
        {view === 'dms' ? (
          <FriendsSidebar activeFriend={activeFriend} onSelectFriend={setActiveFriend} />
        ) : (
          <ChannelSidebar
  server={activeServer}
  activeChannel={activeChannel}
  onSelectChannel={setActiveChannel}
  onServerDeleted={(id) => {
    setServers(servers.filter(s => s.id !== id));
    setActiveServer(null);
    setActiveChannel(null);
    setView('dms');
  }}
/>
        )}
      </div>

      {/* MAIN PANEL */}
      <div className="main-panel">
       {view === 'dms' ? (
  activeFriend ? (
    <DMArea friend={activeFriend} />
  ) : (
    <HomePage onSelectFriend={setActiveFriend} />
  )
) : (
  <ChatArea channel={activeChannel} />
)}
      </div>

      {/* CREATE SERVER MODAL */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Server</h3>
            <form onSubmit={createServer}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Server name" autoFocus />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN SERVER MODAL */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Join Server</h3>
            <form onSubmit={joinServer}>
              <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Server ID" autoFocus />
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAvatarPicker && <AvatarPicker onClose={() => setShowAvatarPicker(false)} />}

      {/* RIGHT PANEL */}
      <div className="right-panel">
        {view === 'servers' && <MembersSidebar server={activeServer} />}
      </div>
      {showBrowser && (
  <ServerBrowser
    onJoin={(server) => {
      if (!servers.find(s => s.id === server.id)) setServers([...servers, server]);
      handleSelectServer(server);
    }}
    onClose={() => setShowBrowser(false)}
  />
)}
<ToastNotification />
    </div>
  );  
}