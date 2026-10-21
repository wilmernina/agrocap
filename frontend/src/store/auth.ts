import { create } from 'zustand';
import type { User } from '../types';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  initialized: boolean;
  setSession: (user: User, accessToken: string) => void;
  restoreOfflineSession: (user: User) => void;
  clearSession: () => void;
  finishInitialization: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setSession: (user, accessToken) => { try { localStorage.setItem('agrosys-ultima-cuenta', JSON.stringify(user)); } catch {} set({ user, accessToken, initialized: true }); },
  restoreOfflineSession: (user) => set({ user, accessToken: null, initialized: true }),
  clearSession: () => { try { localStorage.removeItem('agrosys-ultima-cuenta'); } catch {} set({ user: null, accessToken: null, initialized: true }); },
  finishInitialization: () => set({ initialized: true }),
}));
