import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User, UserPreferences } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Generate a unique device ID
const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
};

// Get or create device ID with fallback for web
const getDeviceId = async (): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } else {
      // Use AsyncStorage for native
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    }
  } catch (error) {
    console.warn('Storage error, generating temporary ID:', error);
    return generateDeviceId();
  }
};

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  initializeUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  initializeUser: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const deviceId = await getDeviceId();

      // Create or get user from backend
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });

      if (!response.ok) throw new Error('Failed to initialize user');
      
      const user = await response.json();
      set({ user, isLoading: false });
    } catch (error) {
      console.error('Error initializing user:', error);
      set({ error: 'Failed to initialize', isLoading: false });
    }
  },

  updatePreferences: async (preferences: Partial<UserPreferences>) => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');
      
      const updatedUser = await response.json();
      set({ user: updatedUser });
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  },

  completeOnboarding: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/complete-onboarding`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to complete onboarding');
      
      const updatedUser = await response.json();
      set({ user: updatedUser });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },

  setUser: (user: User) => set({ user }),
}));
