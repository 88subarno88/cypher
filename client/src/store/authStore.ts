import { create } from "zustand";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; username: string } | null;

  setTokens(accessToken: string, refreshToken: string): void;
  setUser(user: { id: string; username: string }): void;
  logout(): void;
  getAccessToken(): string | null;
}

export const useMyStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    set({ accessToken, refreshToken });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem("accessToken");
    set({ accessToken: null, refreshToken: null, user: null });
  },

  getAccessToken: () =>
    get().accessToken ?? localStorage.getItem("accessToken"),
}));
