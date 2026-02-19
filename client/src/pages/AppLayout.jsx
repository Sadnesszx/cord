import { useState } from 'react';
import ServerSidebar from '../components/layout/ServerSidebar';
import ChannelSidebar from '../components/layout/ChannelSidebar';
import ChatArea from '../components/chat/ChatArea';
import './AppLayout.css';

export default function AppLayout() {
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  const handleSelectServer = (server) => {
    setActiveServer(server);
    setActiveChannel(null);
  };

  return (
    <div className="app-layout">
      <ServerSidebar
        activeServer={activeServer}
        onSelectServer={handleSelectServer}
      />
      <ChannelSidebar
        server={activeServer}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
      />
      <ChatArea channel={activeChannel} />
    </div>
  );
}
