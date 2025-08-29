import { create } from 'zustand';

type User = { email: string } | null;

interface AuthState {
  user: User;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  register: (email: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  register: async (email: string) => {
    set({ loading: true, error: null });
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (!res.ok) {
      set({ error: data.error || 'Registration failed', loading: false });
      return;
    }
    set({ user: data.user, loading: false });
  },
  login: async (email: string) => {
    set({ loading: true, error: null });
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (!res.ok) {
      set({ error: data.error || 'Login failed', loading: false });
      return;
    }
    set({ user: data.user, loading: false });
  },
  logout: async () => {
    set({ loading: true, error: null });
    await fetch('/api/auth/logout', { method: 'POST' });
    set({ user: null, loading: false });
  },
}));

