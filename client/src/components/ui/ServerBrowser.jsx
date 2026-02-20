import { useState, useEffect } from 'react';
import api from '../../lib/api';
import './ServerBrowser.css';

export default function ServerBrowser({ onJoin, onClose }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    api.get('/api/servers/browse/all').then(({ data }) => {
      setServers(data);
      setLoading(false);
    });
  }, []);

  const join = async (server) => {
    setJoining(server.id);
    try {
      const { data } = await api.post(`/api/servers/${server.id}/join`);
      onJoin(data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="browser-overlay" onClick={onClose}>
      <div className="browser-modal" onClick={e => e.stopPropagation()}>
        <div className="browser-header">
          <h3>Browse Servers</h3>
          <button className="browser-close" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="browser-loading">Loading servers...</p>}

        <div className="browser-list">
          {!loading && servers.length === 0 && (
            <p className="browser-empty">No servers yet — create one!</p>
          )}
          {servers.map(s => (
            <div key={s.id} className="browser-server">
              <div className="browser-server-icon">
                {s.name[0].toUpperCase()}
              </div>
              <div className="browser-server-info">
                <span className="browser-server-name">{s.name}</span>
                <span className="browser-server-meta">{s.member_count} member{s.member_count !== 1 ? 's' : ''} · by {s.owner_name}</span>
              </div>
              <button
                className="browser-join-btn"
                onClick={() => join(s)}
                disabled={joining === s.id}
              >
                {joining === s.id ? '...' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}