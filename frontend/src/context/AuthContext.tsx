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
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('reachinbox_user', JSON.stringify(response.data.user));
        return;
      }
    } catch {
      // Fallback to cached session for offline/demo deployments
    }

    const cached = localStorage.getItem('reachinbox_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginWithGoogle = () => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) {
      window.location.href = `${apiUrl.replace(/\/$/, '')}/api/auth/google`;
      return;
    }

    // Demo fallback for frontend deployments before backend is connected
    const demoUser: User = {
      id: 'demo-user-1',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      createdAt: new Date().toISOString(),
    };
    setUser(demoUser);
    localStorage.setItem('reachinbox_user', JSON.stringify(demoUser));
  };

  const loginWithPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ user: User }>('/auth/login', { email, password });
      setUser(response.data.user);
      localStorage.setItem('reachinbox_user', JSON.stringify(response.data.user));
    } catch (error: any) {
      const apiUrl = (import.meta as any).env?.VITE_API_URL;
      if (!apiUrl && (error?.code === 'ERR_NETWORK' || !error?.response)) {
        const demoUser: User = {
          id: 'demo-user-1',
          email,
          name: email.split('@')[0],
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          createdAt: new Date().toISOString(),
        };
        setUser(demoUser);
        localStorage.setItem('reachinbox_user', JSON.stringify(demoUser));
        return;
      }
      console.error('Password login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithPassword = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; message: string; email: string }>('/auth/register', {
        email,
        password,
        name,
      });
      // Do NOT set user on registration so user can sign in explicitly
      return response.data;
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
