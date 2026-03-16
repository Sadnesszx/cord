import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChannelSidebar from '../components/layout/ChannelSidebar';
import FriendsSidebar from '../components/layout/FriendsSidebar';
import ChatArea from '../components/chat/ChatArea';
import DMArea from '../components/chat/DMArea';
import api from '../lib/api';
import AvatarPicker from '../components/ui/AvatarPicker';
import './AppLayout.css';
import '../components/layout/ServerSidebar.css';
import HomePage from '../components/chat/HomePage';
import MembersSidebar from '../components/layout/MembersSidebar';
import ServerBrowser from '../components/ui/ServerBrowser';
import ToastNotification from '../components/ui/ToastNotification';
import { getSocket } from '../lib/socket';
import { useNavigate } from 'react-router-dom';
import WarningModal from '../components/ui/WarningModal';
import SettingsModal from '../components/ui/SettingsModal';
import ProfileModal from '../components/ui/ProfileModal';
import ServerDown from '../components/ui/ServerDown';

export default function AppLayout() {
  const { user, logout, login } = useAuth();
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
  const [banMessage, setBanMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [viewOwnProfile, setViewOwnProfile] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [unreadServers, setUnreadServers] = useState({});
  const [unreadDMs, setUnreadDMs] = useState({});
  const navigate = useNavigate();
  const [avatarClearedMessage, setAvatarClearedMessage] = useState('');
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on('force_logout', ({ reason }) => { logout(); setBanMessage(reason); });
    return () => socket.off('force_logout');
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('avatar_cleared', ({ reason }) => {
      const token = localStorage.getItem('nihilisticchat_token');
      const currentUser = JSON.parse(localStorage.getItem('nihilisticchat_user'));
      const updatedUser = { ...currentUser, avatar_url: null };
      localStorage.setItem('nihilisticchat_user', JSON.stringify(updatedUser));
      login(token, updatedUser);
      setAvatarClearedMessage(`Your profile picture has been removed by an admin.\nReason: ${reason}`);
    });
    return () => socket.off('avatar_cleared');
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('kicked_from_server', ({ serverId }) => {
      setServers(prev => prev.filter(s => s.id !== serverId));
      if (activeServer?.id === serverId) { setActiveServer(null); setActiveChannel(null); setView('dms'); }
    });
    return () => socket.off('kicked_from_server');
  }, [activeServer]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('user_avatar_updated', ({ userId, avatar_url }) => {
      if (String(userId) === String(user?.id)) {
        const token = localStorage.getItem('nihilisticchat_token');
        const currentUser = JSON.parse(localStorage.getItem('nihilisticchat_user'));
        const updatedUser = { ...currentUser, avatar_url };
        localStorage.setItem('nihilisticchat_user', JSON.stringify(updatedUser));
        login(token, updatedUser);
      }
    });
    return () => socket.off('user_avatar_updated');
  }, []);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/health');
        if (!res.ok) setServerDown(true); else setServerDown(false);
      } catch { setServerDown(true); }
    };
    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        const data = await res.json();
        const stored = localStorage.getItem('app_version');
        if (stored && stored !== data.version) window.location.reload();
        localStorage.setItem('app_version', data.version);
      } catch {}
    };
    checkVersion();
    const interval = setInterval(checkVersion, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onNewMessage = (msg) => {
      if (view !== 'servers' || !activeChannel || activeChannel.id !== msg.channel_id) {
        api.get(`/api/channels/${msg.channel_id}`).then(({ data }) => {
          if (activeServer?.id !== data.server_id || view !== 'servers')
            setUnreadServers(prev => ({ ...prev, [data.server_id]: true }));
        }).catch(() => {});
      }
    };
    const onNewDM = (msg) => {
      if (msg.sender_id !== user?.id) {
        if (!activeFriend || activeFriend.id !== msg.sender_id || view !== 'dms')
          setUnreadDMs(prev => ({ ...prev, [msg.sender_id]: true }));
      }
    };
    socket.on('new_message', onNewMessage);
    socket.on('new_dm', onNewDM);
    return () => { socket.off('new_message', onNewMessage); socket.off('new_dm', onNewDM); };
  }, [view, activeChannel, activeFriend, activeServer, user]);

  const loadServers = () => {
    if (!serversLoaded) {
      api.get('/api/servers').then(({ data }) => {
        setServers(data);
        setServersLoaded(true);
        const socket = getSocket();
        data.forEach(s => socket.emit('join_server', s.id));
      });
    }
  };

  const handleSelectServer = (server) => {
    setActiveServer(server);
    setActiveChannel(null);
    setActiveFriend(null);
    setView('servers');
    setUnreadServers(prev => ({ ...prev, [server.id]: false }));
    const socket = getSocket();
    socket.emit('join_server', server.id);
  };

  const handleDMs = () => {
    setView('dms');
    setActiveServer(null);
    setActiveChannel(null);
    setActiveFriend(null);
  };

  const handleSelectFriend = (f) => {
    setActiveFriend(f);
    if (f) setUnreadDMs(prev => ({ ...prev, [f.id]: false }));
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

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id === draggedId) return;
    const draggedIndex = servers.findIndex(s => s.id === draggedId);
    const targetIndex = servers.findIndex(s => s.id === id);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const newServers = [...servers];
    const [removed] = newServers.splice(draggedIndex, 1);
    newServers.splice(targetIndex, 0, removed);
    setServers(newServers);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    // Save order to backend
    const order = servers.map((s, i) => ({ id: s.id, position: i }));
    api.patch('/api/servers/reorder', { order }).catch(() => {});
  };

  useEffect(() => { loadServers(); }, []);

  if (serverDown) return <ServerDown />;

  return (
    <div className="app-layout">
      <div className="server-rail-panel">
        <div className="server-rail-top">
          <div className="rail-user" onClick={() => setViewOwnProfile(true)} title="View profile">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="rail-avatar" style={{ objectFit: 'cover' }} alt={user.username} />
            ) : (
              <div className="rail-avatar" style={{ background: user?.avatar_color || '#555' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="server-divider" />
          <button className={`server-icon ${view === 'dms' ? 'active' : ''}`} onClick={handleDMs} title="Direct Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </button>
          <div className="server-divider" />
          {servers.map(s => (
            <button
              key={s.id}
              className={`server-icon ${activeServer?.id === s.id ? 'active' : ''} ${draggedId === s.id ? 'dragging' : ''}`}
              onClick={() => handleSelectServer(s)}
              title={s.name}
              style={{ position: 'relative', padding: 0, overflow: 'hidden', cursor: draggedId ? 'grabbing' : 'grab' }}
              draggable
              onDragStart={e => handleDragStart(e, s.id)}
              onDragOver={e => handleDragOver(e, s.id)}
              onDragEnd={handleDragEnd}
            >
              {s.icon_url ? (
                <img src={s.icon_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : (
                s.name.slice(0, 2).toUpperCase()
              )}
              {unreadServers[s.id] && <span className="server-unread-dot" />}
            </button>
          ))}
          <div className="server-divider" />
          <button className="server-icon server-add" onClick={() => setShowCreate(true)} title="Create server">+</button>
          <button className="server-icon server-add" onClick={() => setShowBrowser(true)} title="Browse servers">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
        <div className="rail-bottom">
          <button className="server-icon" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
          <button className="server-icon server-danger" onClick={logout} title="Log out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="left-panel">
        {view === 'dms' ? (
          <FriendsSidebar activeFriend={activeFriend} onSelectFriend={handleSelectFriend} unreadDMs={unreadDMs} />
        ) : (
          <ChannelSidebar
            server={activeServer}
            activeChannel={activeChannel}
            onSelectChannel={setActiveChannel}
            onServerDeleted={(id) => { setServers(servers.filter(s => s.id !== id)); setActiveServer(null); setActiveChannel(null); setView('dms'); }}
            onServerRenamed={(updated) => { setServers(servers.map(s => s.id === updated.id ? updated : s)); setActiveServer(updated); }}
          />
        )}
      </div>

      <div className="main-panel">
        {view === 'dms' ? (
          activeFriend ? <DMArea friend={activeFriend} /> : <HomePage onSelectFriend={handleSelectFriend} />
        ) : (
          <ChatArea channel={activeChannel} />
        )}
      </div>

      <div className="right-panel">
        {view === 'servers' && <MembersSidebar server={activeServer} />}
      </div>

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

      {showAvatarPicker && <AvatarPicker onClose={() => setShowAvatarPicker(false)} />}

      {showBrowser && (
        <ServerBrowser
          onJoin={(server) => {
            if (!servers.find(s => s.id === server.id)) setServers([...servers, server]);
            handleSelectServer(server);
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {avatarClearedMessage && <WarningModal message={avatarClearedMessage} onClose={() => setAvatarClearedMessage('')} />}

      <ToastNotification />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {viewOwnProfile && <ProfileModal username={user?.username} onClose={() => setViewOwnProfile(false)} />}
      {banMessage && <WarningModal message={banMessage} onClose={() => { setBanMessage(''); navigate('/'); }} />}
    </div>
  );
}