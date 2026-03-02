// User Types
export interface UserPreferences {
  goals: string[];
  productive_time: string | null;
  available_time: string | null;
}

export interface User {
  id: string;
  device_id: string;
  name: string | null;
  preferences: UserPreferences;
  onboarding_completed: boolean;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

// Task Types
export interface MicroTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  time_estimate: string;
  reward_amount: number;
  status: 'pending' | 'completed' | 'skipped';
  goal_category: string;
  context_question: string | null;
  context_answer: string | null;
  created_at: string;
  completed_at: string | null;
}

// Wallet Types
export interface TokenTransaction {
  id: string;
  amount: number;
  type: 'earned' | 'redeemed' | 'bonus' | 'streak';
  task_id: string | null;
  item_id: string | null;
  description: string;
  timestamp: string;
}

export interface Wallet {
  balance: number;
  total_earned: number;
  total_redeemed: number;
  streak: number;
  recent_transactions: TokenTransaction[];
}

// Marketplace Types
export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  token_cost: number;
  category: string;
  stock: number;
  redemption_type: string;
  is_active: boolean;
}

export interface Redemption {
  id: string;
  user_id: string;
  item_id: string;
  item_title: string;
  tokens_burned: number;
  reward_code: string;
  status: string;
  created_at: string;
}

// Context Question
export interface ContextQuestion {
  question: string;
  options: string[];
}
