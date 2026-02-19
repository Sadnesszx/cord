import { createContext, useContext, useState, useEffect } from 'react';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('SadLounge_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (token, userData) => {
    localStorage.setItem('SadLounge_token', token);
    localStorage.setItem('SadLounge_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('SadLounge_token');
    localStorage.removeItem('SadLounge_user');
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
