import { useState } from 'react';
import ServerSidebar from '../components/layout/ServerSidebar';
import ChannelSidebar from '../components/layout/ChannelSidebar';
import FriendsSidebar from '../components/layout/FriendsSidebar';
import ChatArea from '../components/chat/ChatArea';
import DMArea from '../components/chat/DMArea';
import './AppLayout.css';

export default function AppLayout() {
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeFriend, setActiveFriend] = useState(null);
  const [view, setView] = useState('servers'); // 'servers' | 'dms'

  const handleSelectServer = (server) => {
    if (server === null) {
      setView('dms');
      setActiveServer(null);
      setActiveChannel(null);
    } else {
      setView('servers');
      setActiveServer(server);
      setActiveChannel(null);
      setActiveFriend(null);
    }
  };

  return (
    <div className="app-layout">
      <ServerSidebar
        activeServer={activeServer}
        onSelectServer={handleSelectServer}
        view={view}
      />
      {view === 'dms' ? (
        <FriendsSidebar
          activeFriend={activeFriend}
          onSelectFriend={setActiveFriend}
        />
      ) : (
        <ChannelSidebar
          server={activeServer}
          activeChannel={activeChannel}
          onSelectChannel={setActiveChannel}
        />
      )}
      {view === 'dms' ? (
        <DMArea friend={activeFriend} />
      ) : (
        <ChatArea channel={activeChannel} />
      )}
    </div>
  );
}