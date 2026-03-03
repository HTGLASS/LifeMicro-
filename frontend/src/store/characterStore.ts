import { create } from 'zustand';
import {
  Character,
  CharacterResponse,
  CharacterItem,
  TrustScore,
  PurchaseResponse,
  PixelData,
} from '../types/character';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface CharacterState {
  character: Character | null;
  characterResponse: CharacterResponse | null;
  trustScore: TrustScore | null;
  storeItems: CharacterItem[];
  inventory: CharacterItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCharacter: (userId: string) => Promise<CharacterResponse | null>;
  createCharacter: (userId: string, name: string, pixelData?: PixelData) => Promise<boolean>;
  updateAvatar: (userId: string, pixelData: PixelData) => Promise<boolean>;
  fetchTrustScore: (userId: string) => Promise<TrustScore | null>;
  fetchStoreItems: (userId?: string, category?: string, rarity?: string) => Promise<void>;
  fetchInventory: (userId: string) => Promise<void>;
  purchaseItem: (userId: string, itemId: string) => Promise<PurchaseResponse | null>;
  equipItem: (userId: string, itemId: string) => Promise<boolean>;
  unequipItem: (userId: string, category: string) => Promise<boolean>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  characterResponse: null,
  trustScore: null,
  storeItems: [],
  inventory: [],
  isLoading: false,
  error: null,

  fetchCharacter: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Character doesn't exist yet
          set({ character: null, characterResponse: null, isLoading: false });
          return null;
        }
        throw new Error('Failed to fetch character');
      }
      const data: CharacterResponse = await response.json();
      set({ 
        character: data.character, 
        characterResponse: data,
        isLoading: false 
      });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  createCharacter: async (userId: string, name: string, pixelData?: PixelData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/character/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name,
          avatar_pixel_data: pixelData,
        }),
      });
      if (!response.ok) throw new Error('Failed to create character');
      const character = await response.json();
      set({ character, isLoading: false });
      return true;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },

  updateAvatar: async (userId: string, pixelData: PixelData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_pixel_data: pixelData,
        }),
      });
      if (!response.ok) throw new Error('Failed to update avatar');
      
      // Refresh character data
      await get().fetchCharacter(userId);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },

  fetchTrustScore: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/trust-score/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch trust score');
      const data: TrustScore = await response.json();
      set({ trustScore: data });
      return data;
    } catch (error) {
      console.error('Error fetching trust score:', error);
      return null;
    }
  },

  fetchStoreItems: async (userId?: string, category?: string, rarity?: string) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (category) params.append('category', category);
      if (rarity) params.append('rarity', rarity);

      const response = await fetch(`${API_URL}/api/character-store?${params}`);
      if (!response.ok) throw new Error('Failed to fetch store items');
      const data = await response.json();
      set({ storeItems: data.items, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchInventory: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}/inventory`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      set({ inventory: data.items });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  },

  purchaseItem: async (userId: string, itemId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to purchase item');
      }
      
      const data: PurchaseResponse = await response.json();
      
      // Refresh inventory and store
      await get().fetchInventory(userId);
      await get().fetchStoreItems(userId);
      
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  equipItem: async (userId: string, itemId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (!response.ok) throw new Error('Failed to equip item');
      
      // Refresh character
      await get().fetchCharacter(userId);
      return true;
    } catch (error) {
      console.error('Error equipping item:', error);
      return false;
    }
  },

  unequipItem: async (userId: string, category: string) => {
    try {
      const response = await fetch(`${API_URL}/api/character/${userId}/unequip?category=${category}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to unequip item');
      
      // Refresh character
      await get().fetchCharacter(userId);
      return true;
    } catch (error) {
      console.error('Error unequipping item:', error);
      return false;
    }
  },
}));
