import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Density = 'comfortable' | 'compact';
export interface UserPrefsState {
  pageSize: number;
  density: Density;
  theme: 'light' | 'dark' | 'system';
  setPageSize: (n: number) => void;
  setDensity: (d: Density) => void;
  setTheme: (t: UserPrefsState['theme']) => void;
}

export const useUserPrefsStore = create<UserPrefsState>()(persist((set) => ({
  pageSize: 25,
  density: 'comfortable',
  theme: 'system',
  setPageSize: (pageSize) => set({ pageSize }),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),
}), { name: 'scrapper-user-prefs' }));
