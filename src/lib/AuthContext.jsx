import React, { createContext, useState, useContext, useEffect } from 'react';
import { authClient } from '@/api/authClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      await checkUserAuth();
    } catch (error) {
      if (error.status !== 401) {
        console.error('Session check failed:', error);
        setAuthError({ type: 'unknown', message: error.message || 'Failed to load app' });
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { user: currentUser } = await authClient.session();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (error) {
      if (error.status !== 401) console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (error.status !== 401) setAuthError({ type: 'unknown', message: error.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (redirectUrl = '/') => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    setAuthError(null);
    window.dispatchEvent(new CustomEvent('before-logout'));
    try {
      await authClient.logout();
    } catch {
      window.location.assign(redirectUrl);
    }
  };

  const navigateToLogin = () => {
    window.location.assign('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};