import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: string; phone?: string; address?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res && res.user) {
        setUser(res.user);
      } else {
        // If not logged in, auto-login as demo customer by default so the app is immediately usable!
        await switchDemoRole('customer');
      }
    } catch {
      await switchDemoRole('customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
  };

  const register = async (data: { name: string; email: string; password: string; role?: string; phone?: string; address?: string }) => {
    const res = await api.register(data);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const switchDemoRole = async (role: UserRole) => {
    try {
      setLoading(true);
      let email = 'sarah.chen@example.com';
      let password = 'customer123';

      if (role === 'restaurant') {
        email = 'chef.marco@example.com';
        password = 'restaurant123';
      } else if (role === 'delivery') {
        email = 'alex.rider@example.com';
        password = 'rider123';
      }

      const res = await api.login(email, password);
      setUser(res.user);
    } catch (e) {
      console.error('Failed to switch demo role:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchDemoRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
