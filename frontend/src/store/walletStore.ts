import { create } from 'zustand';
import { Wallet, TokenTransaction, MarketplaceItem, Redemption } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface WalletState {
  wallet: Wallet | null;
  marketplaceItems: MarketplaceItem[];
  redemptions: Redemption[];
  isLoading: boolean;
  error: string | null;
  fetchWallet: (userId: string) => Promise<void>;
  fetchMarketplace: () => Promise<void>;
  fetchRedemptions: (userId: string) => Promise<void>;
  redeemItem: (userId: string, itemId: string) => Promise<{ success: boolean; reward_code?: string; error?: string }>;
  refreshBalance: (userId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  marketplaceItems: [],
  redemptions: [],
  isLoading: false,
  error: null,

  fetchWallet: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/wallet/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch wallet');
      const data = await response.json();
      set({ wallet: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      set({ error: 'Failed to fetch wallet', isLoading: false });
    }
  },

  fetchMarketplace: async () => {
    try {
      const response = await fetch(`${API_URL}/api/marketplace`);
      if (!response.ok) throw new Error('Failed to fetch marketplace');
      const data = await response.json();
      set({ marketplaceItems: data.items || [] });
    } catch (error) {
      console.error('Error fetching marketplace:', error);
    }
  },

  fetchRedemptions: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/marketplace/redemptions/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch redemptions');
      const data = await response.json();
      set({ redemptions: data.redemptions || [] });
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    }
  },

  redeemItem: async (userId: string, itemId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/marketplace/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, item_id: itemId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.detail || 'Redemption failed' };
      }
      
      // Refresh wallet after redemption
      await get().fetchWallet(userId);
      await get().fetchRedemptions(userId);
      
      return { success: true, reward_code: data.reward_code };
    } catch (error) {
      console.error('Error redeeming item:', error);
      return { success: false, error: 'Network error' };
    }
  },

  refreshBalance: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/wallet/${userId}`);
      if (!response.ok) throw new Error('Failed to refresh balance');
      const data = await response.json();
      set({ wallet: data });
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  },
}));
