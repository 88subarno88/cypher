import { create } from 'zustand';

export interface CryptoState {
  keyPair: CryptoKeyPair | null;
  setKeyPair: (keyPair: CryptoKeyPair | null) => void;
  clearKeyPair: () => void;
}

export const useCryptoStore = create<CryptoState>()((set) => ({
  // Initial state
  keyPair: null,
  
  // Actions
  setKeyPair: (keyPair) => set({ keyPair }),
  clearKeyPair: () => set({ keyPair: null }),
}));