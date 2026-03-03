// Types for Anti-Cheat and Character Systems

export interface TrustScore {
  trust_score: number;
  tier: 'exemplary' | 'standard' | 'probation' | 'restricted';
  tier_config: {
    reward_multiplier: number;
    verification_probability: number;
    verification_strictness: 'lenient' | 'moderate' | 'strict' | 'mandatory';
    settlement_delay_hours: number;
  };
  verified_task_count: number;
  suspicious_flag_count: number;
}

export interface Verification {
  type: 'text_reflection' | 'contextual_question' | 'photo_upload' | 'voice_reflection';
  strictness: 'lenient' | 'moderate' | 'strict' | 'mandatory';
  required: boolean;
  partial_points_if_skipped: boolean;
  skip_penalty: number;
  question?: string;
  options?: string[];
  prompt?: string;
  min_length?: number;
  min_duration?: number;
}

export interface TaskStartResponse {
  success: boolean;
  started_at: string;
  verification_required: boolean;
  verification: Verification | null;
  min_completion_time: number;
}

export interface TaskCompleteResponse {
  success: boolean;
  tokens_earned: number;
  tokens_pending: number;
  streak_bonus: number;
  new_balance: number;
  trust_score: number;
  trust_change: number;
  validation_status: 'validated' | 'pending_review' | 'suspicious';
  is_verified: boolean;
  reward_multiplier: number;
  message: string;
}

// Character Types

export type EvolutionTier = 'seedling' | 'sprout' | 'bloom' | 'flourish' | 'transcend';
export type CharacterMood = 'thriving' | 'happy' | 'neutral' | 'tired' | 'weak' | 'fading';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'skin' | 'accessory' | 'background' | 'particle_effect' | 'companion' | 'seasonal';

export interface CharacterStats {
  energy: number;
  momentum: number;
  integrity: number;
  evolution_progress: number;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  avatar_original_url?: string;
  avatar_pixelated_url?: string;
  avatar_pixel_data?: PixelData;
  avatar_created_at?: string;
  evolution_tier: EvolutionTier;
  verified_task_count: number;
  evolution_paused: boolean;
  evolution_pause_reason?: string;
  stats: CharacterStats;
  current_mood: CharacterMood;
  last_active_date?: string;
  days_inactive: number;
  highest_streak: number;
  total_tasks_completed: number;
  equipped_items: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface PixelData {
  width: number;
  height: number;
  pixelSize: number;
  colors: string[][];
}

export interface MoodConfig {
  days_inactive: number;
  min_energy: number;
  animation: string;
  glow_color: string | null;
  expression: string;
  visual_effects?: string[];
}

export interface EvolutionConfig {
  min_tasks: number;
  max_tasks: number;
  trust_requirement: number;
  streak_requirement: number;
  display_name: string;
  description: string;
  pixel_size: number;
  color_palette: number;
}

export interface CharacterItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  trust_requirement: number;
  streak_requirement: number;
  verified_requirement: number;
  base_price: number;
  preview_url?: string;
  asset_data?: any;
  is_active: boolean;
  is_seasonal: boolean;
  season_end_date?: string;
  stock: number;
  created_at: string;
  // Client-side additions
  owned?: boolean;
  eligible?: boolean;
  can_afford?: boolean;
}

export interface CharacterResponse {
  character: Character;
  stats: CharacterStats;
  mood: CharacterMood;
  mood_config: MoodConfig;
  evolution: {
    current_tier: EvolutionTier;
    tier_config: EvolutionConfig;
    can_evolve: {
      can_evolve: boolean;
      next_tier: EvolutionTier | null;
      requirements?: any;
      blockers: string[];
    };
    pixel_settings: {
      pixel_size: number;
      color_palette: number;
      smoothing: boolean;
    };
  };
  deterioration: any | null;
  days_inactive: number;
}

export interface PurchaseResponse {
  success: boolean;
  purchase_id: string;
  item_name: string;
  tokens_spent: number;
  status: 'completed' | 'pending';
  settlement_date?: string;
  cooldown_expires: string;
}

// Rarity colors
export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9CA3AF',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

// Evolution tier colors
export const EVOLUTION_COLORS: Record<EvolutionTier, string> = {
  seedling: '#8BC34A',
  sprout: '#4CAF50',
  bloom: '#00BCD4',
  flourish: '#9C27B0',
  transcend: '#FF9800',
};

// Mood emoji/expressions
export const MOOD_EXPRESSIONS: Record<CharacterMood, string> = {
  thriving: '🌟',
  happy: '😊',
  neutral: '😐',
  tired: '😴',
  weak: '😓',
  fading: '😢',
};
