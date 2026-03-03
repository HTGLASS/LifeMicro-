import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  visibility: 'public' | 'private';
  avatar_preview: any | null;
  total_tasks_completed: number;
  current_streak: number;
  longest_streak: number;
  trust_score: number;
  evolution_tier: string;
  equipped_items_count: number;
  achievements: string[];
  followers_count: number;
  following_count: number;
  groups_count: number;
  is_following?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  is_open: boolean;
  member_count: number;
  total_tasks_completed: number;
  active_challenges: number;
  is_member?: boolean;
}

export interface Challenge {
  id: string;
  group_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  category: string | null;
  voting_ends_at: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_days: number;
  status: 'proposed' | 'active' | 'completed' | 'cancelled';
  votes_for: number;
  votes_against: number;
  votes_needed: number;
  voters: string[];
  participants: string[];
  current_progress: number;
  reward_per_participant: number;
}

export interface ActivityItem {
  id: string;
  user_id: string;
  username: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  message_type: 'message' | 'announcement' | 'system';
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface ChallengeProgress {
  challenge_id: string;
  title: string;
  status: string;
  target_value: number;
  current_progress: number;
  participant_count: number;
  completed_count: number;
  participants: {
    user_id: string;
    username: string;
    progress: number;
    completed: boolean;
  }[];
  ends_at: string | null;
  reward_per_participant: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  evolution_tier: string;
  achievements: string[];
  rank: number;
  [key: string]: any;
}

interface CommunityState {
  myProfile: UserProfile | null;
  viewingProfile: UserProfile | null;
  groups: Group[];
  myGroups: Group[];
  currentGroup: Group | null;
  challenges: Challenge[];
  leaderboard: LeaderboardEntry[];
  activityFeed: ActivityItem[];
  groupMessages: GroupMessage[];
  challengeProgress: ChallengeProgress | null;
  blockedUsers: string[];
  isLoading: boolean;
  error: string | null;

  // Profile actions
  fetchMyProfile: (userId: string) => Promise<void>;
  createProfile: (userId: string, username: string, displayName?: string, visibility?: 'public' | 'private') => Promise<boolean>;
  updateProfile: (userId: string, updates: Partial<UserProfile>) => Promise<boolean>;
  fetchProfile: (userId: string, requesterId?: string) => Promise<UserProfile | null>;

  // Follow actions
  followUser: (targetUserId: string, followerId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string, followerId: string) => Promise<boolean>;

  // Group actions
  fetchGroups: (search?: string) => Promise<void>;
  fetchMyGroups: (userId: string) => Promise<void>;
  fetchGroup: (groupId: string, userId?: string) => Promise<void>;
  createGroup: (userId: string, name: string, description?: string) => Promise<string | null>;
  joinGroup: (groupId: string, userId: string) => Promise<boolean>;
  leaveGroup: (groupId: string, userId: string) => Promise<boolean>;

  // Challenge actions
  fetchGroupChallenges: (groupId: string, status?: string) => Promise<void>;
  createChallenge: (groupId: string, userId: string, data: any) => Promise<boolean>;
  voteOnChallenge: (challengeId: string, userId: string, vote: boolean) => Promise<boolean>;
  joinChallenge: (challengeId: string, userId: string) => Promise<boolean>;
  fetchChallengeProgress: (challengeId: string) => Promise<void>;

  // Chat actions
  fetchGroupMessages: (groupId: string, userId?: string) => Promise<void>;
  sendGroupMessage: (groupId: string, userId: string, content: string, type?: string) => Promise<boolean>;

  // Report & Block actions
  reportUser: (reporterId: string, reportedId: string, reason: string, description?: string) => Promise<boolean>;
  blockUser: (blockerId: string, targetId: string) => Promise<boolean>;
  unblockUser: (blockerId: string, targetId: string) => Promise<boolean>;
  fetchBlockedUsers: (userId: string) => Promise<void>;

  // Feed actions
  fetchLeaderboard: (category?: string) => Promise<void>;
  fetchActivityFeed: (userId?: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  myProfile: null,
  viewingProfile: null,
  groups: [],
  myGroups: [],
  currentGroup: null,
  challenges: [],
  leaderboard: [],
  activityFeed: [],
  groupMessages: [],
  challengeProgress: null,
  blockedUsers: [],
  isLoading: false,
  error: null,

  // Profile actions
  fetchMyProfile: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/profile/${userId}?requester_id=${userId}`);
      if (response.ok) {
        const profile = await response.json();
        set({ myProfile: profile });
      } else if (response.status === 404) {
        set({ myProfile: null });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  createProfile: async (userId: string, username: string, displayName?: string, visibility?: 'public' | 'private') => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_URL}/api/community/profile?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          display_name: displayName || username,
          visibility: visibility || 'private',
        }),
      });

      if (response.ok) {
        const profile = await response.json();
        set({ myProfile: profile, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Error creating profile:', error);
      set({ isLoading: false });
      return false;
    }
  },

  updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const response = await fetch(`${API_URL}/api/community/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const profile = await response.json();
        set({ myProfile: profile });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  },

  fetchProfile: async (userId: string, requesterId?: string) => {
    try {
      const url = requesterId 
        ? `${API_URL}/api/community/profile/${userId}?requester_id=${requesterId}`
        : `${API_URL}/api/community/profile/${userId}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const profile = await response.json();
        set({ viewingProfile: profile });
        return profile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // Follow actions
  followUser: async (targetUserId: string, followerId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/follow/${targetUserId}?follower_id=${followerId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  },

  unfollowUser: async (targetUserId: string, followerId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/follow/${targetUserId}?follower_id=${followerId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  },

  // Group actions
  fetchGroups: async (search?: string) => {
    try {
      set({ isLoading: true });
      const url = search 
        ? `${API_URL}/api/community/groups?search=${encodeURIComponent(search)}`
        : `${API_URL}/api/community/groups`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        set({ groups: data.groups, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      set({ isLoading: false });
    }
  },

  fetchMyGroups: async (userId: string) => {
    // For now, fetch all groups and filter (in production, add a dedicated endpoint)
    try {
      const response = await fetch(`${API_URL}/api/community/groups`);
      if (response.ok) {
        const data = await response.json();
        // TODO: Filter by membership when endpoint is available
        set({ myGroups: data.groups });
      }
    } catch (error) {
      console.error('Error fetching my groups:', error);
    }
  },

  fetchGroup: async (groupId: string, userId?: string) => {
    try {
      const url = userId 
        ? `${API_URL}/api/community/groups/${groupId}?user_id=${userId}`
        : `${API_URL}/api/community/groups/${groupId}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const group = await response.json();
        set({ currentGroup: group });
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  },

  createGroup: async (userId: string, name: string, description?: string) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_URL}/api/community/groups?creator_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        const group = await response.json();
        set({ isLoading: false });
        return group.id;
      }
      set({ isLoading: false });
      return null;
    } catch (error) {
      console.error('Error creating group:', error);
      set({ isLoading: false });
      return null;
    }
  },

  joinGroup: async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/groups/${groupId}/join?user_id=${userId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error joining group:', error);
      return false;
    }
  },

  leaveGroup: async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/groups/${groupId}/leave?user_id=${userId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error leaving group:', error);
      return false;
    }
  },

  // Challenge actions
  fetchGroupChallenges: async (groupId: string, status?: string) => {
    try {
      const url = status 
        ? `${API_URL}/api/community/groups/${groupId}/challenges?status=${status}`
        : `${API_URL}/api/community/groups/${groupId}/challenges`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        set({ challenges: data.challenges });
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  },

  createChallenge: async (groupId: string, userId: string, data: any) => {
    try {
      const response = await fetch(`${API_URL}/api/community/groups/${groupId}/challenges?creator_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch (error) {
      console.error('Error creating challenge:', error);
      return false;
    }
  },

  voteOnChallenge: async (challengeId: string, userId: string, vote: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/community/challenges/${challengeId}/vote?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error voting on challenge:', error);
      return false;
    }
  },

  joinChallenge: async (challengeId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/challenges/${challengeId}/join?user_id=${userId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error joining challenge:', error);
      return false;
    }
  },

  // Feed actions
  fetchLeaderboard: async (category?: string) => {
    try {
      const url = category 
        ? `${API_URL}/api/community/leaderboard?category=${category}`
        : `${API_URL}/api/community/leaderboard`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        set({ leaderboard: data.leaderboard });
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  },

  fetchActivityFeed: async (userId?: string) => {
    try {
      const url = userId 
        ? `${API_URL}/api/community/activity?user_id=${userId}`
        : `${API_URL}/api/community/activity`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        set({ activityFeed: data.activities });
      }
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    }
  },

  // Challenge Progress
  fetchChallengeProgress: async (challengeId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/challenges/${challengeId}/progress`);
      if (response.ok) {
        const data = await response.json();
        set({ challengeProgress: data });
      }
    } catch (error) {
      console.error('Error fetching challenge progress:', error);
    }
  },

  // Chat actions
  fetchGroupMessages: async (groupId: string, userId?: string) => {
    try {
      const url = userId
        ? `${API_URL}/api/community/groups/${groupId}/messages?user_id=${userId}`
        : `${API_URL}/api/community/groups/${groupId}/messages`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        set({ groupMessages: data.messages });
      }
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  },

  sendGroupMessage: async (groupId: string, userId: string, content: string, type: string = 'message') => {
    try {
      const response = await fetch(`${API_URL}/api/community/groups/${groupId}/messages?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, message_type: type }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  },

  // Report & Block actions
  reportUser: async (reporterId: string, reportedId: string, reason: string, description?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/report?reporter_id=${reporterId}&reported_user_id=${reportedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, description }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  },

  blockUser: async (blockerId: string, targetId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/block/${targetId}?blocker_id=${blockerId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  },

  unblockUser: async (blockerId: string, targetId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/block/${targetId}?blocker_id=${blockerId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  },

  fetchBlockedUsers: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/community/blocked?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        set({ blockedUsers: data.blocked_users.map((u: any) => u.user_id) });
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  },
}));
