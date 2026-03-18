import { create } from "zustand";
import type { User } from "@/types";
import { getToken, setToken, getStoredUser, setStoredUser, clearAuth } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (token: string, user: User) => {
    setToken(token);
    setStoredUser(user);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearAuth();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  initialize: () => {
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      set({ user: user as User, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
