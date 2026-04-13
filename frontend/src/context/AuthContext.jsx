import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // initial auth check

  // On mount, restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('clinic_token');
    const storedUser  = localStorage.getItem('clinic_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('clinic_token');
        localStorage.removeItem('clinic_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { token: jwt, user: u } = data;

    localStorage.setItem('clinic_token', jwt);
    localStorage.setItem('clinic_user',  JSON.stringify(u));
    setToken(jwt);
    setUser(u);

    return u; // caller can use the role to redirect
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    const { token: jwt, user: u } = data;

    localStorage.setItem('clinic_token', jwt);
    localStorage.setItem('clinic_user',  JSON.stringify(u));
    setToken(jwt);
    setUser(u);

    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for convenience
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
