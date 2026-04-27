import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await authAPI.checkAuth();
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    setUser(res.data);
    return res.data;
  };

  const register = async (data: { username: string; email: string; password: string; password_confirm: string }) => {
    const res = await authAPI.register(data);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return { user, loading, login, register, logout, checkAuth };
}
