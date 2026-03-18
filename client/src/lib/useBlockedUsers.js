import { useState, useEffect } from 'react';
import api from './api';

let cachedBlocked = null;
let listeners = [];

const notify = () => listeners.forEach(fn => fn(cachedBlocked));

export function useBlockedUsers() {
  const [blockedIds, setBlockedIds] = useState(cachedBlocked || []);

  useEffect(() => {
    const update = (ids) => setBlockedIds(ids);
    listeners.push(update);

    if (!cachedBlocked) {
      api.get('/api/friends').then(() => {}).catch(() => {});
      // Fetch all blocked users
      api.get('/api/friends/blocked').then(({ data }) => {
        cachedBlocked = data.map(u => String(u.id));
        notify();
      }).catch(() => {
        cachedBlocked = [];
        notify();
      });
    }

    return () => { listeners = listeners.filter(fn => fn !== update); };
  }, []);

  return blockedIds;
}

export function invalidateBlockedCache() {
  cachedBlocked = null;
}