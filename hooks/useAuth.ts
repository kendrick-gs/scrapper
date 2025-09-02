'use client';

import { useState, useEffect } from 'react';

interface User {
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const checkAuth = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setState({ user: data.user, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      setState({ user: null, loading: false, error: 'Failed to check authentication' });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setState({ user: data.user, loading: false, error: null });
        return { success: true };
      } else {
        setState(prev => ({ ...prev, loading: false, error: data.error || 'Login failed' }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Network error during login';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setState({ user: data.user, loading: false, error: null });
        return { success: true };
      } else {
        setState(prev => ({ ...prev, loading: false, error: data.error || 'Registration failed' }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Network error during registration';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setState({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setState({ user: null, loading: false, error: null });
    }
  };

  const refresh = () => {
    checkAuth();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    refresh,
  };
}