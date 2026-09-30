'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'PASSENGER' | 'DRIVER';
  walletBalancePaisa: number;
  tesla?: {
    id: string;
    driverId: string;
    name: string;
    totalSeats: number;
    isOnline: boolean;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'PASSENGER' | 'DRIVER';
    teslaName?: string;
  }) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user from token
  const refreshUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('dhaka_tesla_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const res = await api.get<{ user: UserProfile }>('/api/auth/me');
      setUser(res.user);
    } catch (err) {
      console.error('Failed to authenticate stored token:', err);
      localStorage.removeItem('dhaka_tesla_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; user: UserProfile }>('/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('dhaka_tesla_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: 'PASSENGER' | 'DRIVER';
    teslaName?: string;
  }): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; user: UserProfile }>('/api/auth/register', data);
      localStorage.setItem('dhaka_tesla_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dhaka_tesla_token');
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
