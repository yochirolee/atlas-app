import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Session {
  token: string;
}

interface AppState {
  session: Session | null;
  user: any | null;
  agency: any | null;
  setSession: (session: Session | null) => void;
  setUser: (user: any) => void;
  setAgency: (agency: any) => void;
  logout: () => void;
  clearAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      agency: null,
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setAgency: (agency) => set({ agency }),
      logout: () => set({ session: null, user: null, agency: null }),
      clearAll: () => set({ session: null, user: null, agency: null }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
