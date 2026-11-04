import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { User, AuthContextType } from '../types/auth.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await api.get<{ user: User | null }>('/auth/me');
      setUser(response.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const loginWithPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ user: User }>('/auth/login', { email, password });
      setUser(response.data.user);
    } catch (error) {
      console.error('Password login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithPassword = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ user: User }>('/auth/register', { email, password, name });
      setUser(response.data.user);
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post<{ user: User }>('/auth/dev-login');
      setUser(response.data.user);
    } catch (error) {
      console.error('Demo login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithPassword,
        registerWithPassword,
        devLogin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
