import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getStoredToken());
  const [theme, setTheme] = useState(localStorage.getItem('finguard_theme') || 'dark');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('finguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setToken(data.token);
      setUser(data.user);
      setStoredToken(data.token);
      setStoredUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (email, name, role = 'Admin') => {
    setLoading(true);
    try {
      const data = await api.googleLogin(email, name, role);
      setToken(data.token);
      setUser(data.user);
      setStoredToken(data.token);
      setStoredUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setStoredToken('');
    setStoredUser(null);
  };

  // Demo helper: quick switch between Admin, Victim, Investigator
  const switchRole = async (targetRole) => {
    const roleUserMap = {
      Admin: { u: 'admin', p: 'Admin@123' },
      Victim: { u: 'victim', p: 'Victim@123' },
      Investigator: { u: 'investigator', p: 'Investigator@123' },
      // Backward compatibility aliases
      Analyst: { u: 'victim', p: 'Victim@123' },
      Officer: { u: 'investigator', p: 'Investigator@123' },
      Citizen: { u: 'victim', p: 'Victim@123' }
    };
    const creds = roleUserMap[targetRole] || roleUserMap.Admin;
    return await login(creds.u, creds.p);
  };

  const isAuthenticated = !!(token || getStoredToken()) && !!(user || getStoredUser());

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      theme,
      toggleTheme,
      login,
      loginWithGoogle,
      logout,
      switchRole,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
