import { useState, useEffect } from 'react';
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

  useEffect(() => {
  const socket = getSocket();
  socket.on('force_logout', ({ reason }) => {
    logout();
    setBanMessage(reason);
  });
  return () => socket.off('force_logout');
}, []);

useEffect(() => {
  const socket = getSocket();
  socket.on('avatar_cleared', ({ reason }) => {
    const token = localStorage.getItem('sadlounge_token');
    const currentUser = JSON.parse(localStorage.getItem('sadlounge_user'));
    const updatedUser = { ...currentUser, avatar_url: null };
    localStorage.setItem('sadlounge_user', JSON.stringify(updatedUser));
    login(token, updatedUser);
    setAvatarClearedMessage(`Your profile picture has been removed by an admin.\nReason: ${reason}`);
  });
  return () => socket.off('avatar_cleared');  
}, []);

 useEffect(() => {
  const socket = getSocket();
  socket.on('user_avatar_updated', ({ userId, avatar_url }) => {
    if (String(userId) === String(user?.id)) {
      const token = localStorage.getItem('sadlounge_token');
      const currentUser = JSON.parse(localStorage.getItem('sadlounge_user'));
      const updatedUser = { ...currentUser, avatar_url };
      localStorage.setItem('sadlounge_user', JSON.stringify(updatedUser));
      login(token, updatedUser);
    }
  });
  return () => socket.off('user_avatar_updated');
}, []);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('https://sadlounge.onrender.com/health');
        if (!res.ok) setServerDown(true);
        else setServerDown(false);
      } catch (err) {
        setServerDown(true);
      }
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
      } catch (err) {}
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
          if (activeServer?.id !== data.server_id || view !== 'servers') {
            setUnreadServers(prev => ({ ...prev, [data.server_id]: true }));
          }
        }).catch(() => {});
      }
    };

    const onNewDM = (msg) => {
      if (msg.sender_id !== user?.id) {
        if (!activeFriend || activeFriend.id !== msg.sender_id || view !== 'dms') {
          setUnreadDMs(prev => ({ ...prev, [msg.sender_id]: true }));
        }
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('new_dm', onNewDM);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('new_dm', onNewDM);
    };
  }, [view, activeChannel, activeFriend, activeServer, user]);

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
    setUnreadServers(prev => ({ ...prev, [server.id]: false }));
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

  useState(() => { loadServers(); }, []);

  if (serverDown) return <ServerDown />;

  return (
    <div className="app-layout">
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
              style={{ position: 'relative' }}
            >
              {s.name}
              {unreadServers[s.id] && <span className="unread-badge" />}
            </button>
          ))}

          <button className="top-bar-new-server" onClick={() => setShowCreate(true)}>+ New</button>
          <button className="top-bar-new-server" onClick={() => setShowBrowser(true)}>Browse</button>
        </div>

        <div className="top-bar-actions">
          <button className="top-bar-settings" onClick={() => setShowSettings(true)} title="Settings">
            ⚙️
          </button>
          <div className="top-bar-user" onClick={() => setViewOwnProfile(true)} style={{ cursor: 'pointer' }} title="View profile">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="top-bar-avatar" style={{ objectFit: 'cover' }} alt={user.username} />
            ) : (
              <div className="top-bar-avatar" style={{ background: user?.avatar_color || '#555' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="top-bar-username">{user?.username}</span>
            <button className="top-bar-logout" onClick={logout} title="Log out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="left-panel">
        {view === 'dms' ? (
          <FriendsSidebar
            activeFriend={activeFriend}
            onSelectFriend={handleSelectFriend}
            unreadDMs={unreadDMs}
          />
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
            onServerRenamed={(updated) => {
              setServers(servers.map(s => s.id === updated.id ? updated : s));
              setActiveServer(updated);
            }}
          />
        )}
      </div>

      <div className="main-panel">
        {view === 'dms' ? (
          activeFriend ? (
            <DMArea friend={activeFriend} />
          ) : (
            <HomePage onSelectFriend={handleSelectFriend} />
          )
        ) : (
          <ChatArea channel={activeChannel} />
        )}
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

      {avatarClearedMessage && (
  <WarningModal
    message={avatarClearedMessage}
    onClose={() => setAvatarClearedMessage('')}
  />
)}

      <ToastNotification />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {viewOwnProfile && <ProfileModal username={user?.username} onClose={() => setViewOwnProfile(false)} />}
      {banMessage && (
        <WarningModal
          message={banMessage}
          onClose={() => { setBanMessage(''); navigate('/'); }}
        />
      )}
    </div>
  );
}