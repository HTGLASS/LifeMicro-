import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useCommunityStore } from '../../src/store/communityStore';
import { colors, shadows } from '../../src/constants/theme';

type TabType = 'feed' | 'groups' | 'leaderboard';

const EVOLUTION_COLORS: Record<string, string> = {
  seedling: '#4ECCA3',
  sprout: '#00E5BF',
  bloom: '#3B82F6',
  flourish: '#8B5CF6',
  transcend: '#F59E0B',
};

export default function CommunityScreen() {
  const { user } = useUserStore();
  const {
    myProfile,
    groups,
    leaderboard,
    activityFeed,
    isLoading,
    fetchMyProfile,
    createProfile,
    fetchGroups,
    fetchLeaderboard,
    fetchActivityFeed,
    createGroup,
    joinGroup,
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [leaderboardCategory, setLeaderboardCategory] = useState('tasks');

  // Profile creation form
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Group creation form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchMyProfile(user.id);
      loadTabData();
    }
  }, [user?.id]);

  useEffect(() => {
    loadTabData();
  }, [activeTab, leaderboardCategory]);

  const loadTabData = async () => {
    switch (activeTab) {
      case 'feed':
        await fetchActivityFeed(user?.id);
        break;
      case 'groups':
        await fetchGroups();
        break;
      case 'leaderboard':
        await fetchLeaderboard(leaderboardCategory);
        break;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchMyProfile(user.id);
    }
    await loadTabData();
    setRefreshing(false);
  };

  const handleCreateProfile = async () => {
    if (!user?.id || !newUsername.trim()) return;

    const success = await createProfile(
      user.id,
      newUsername.trim(),
      newDisplayName.trim() || newUsername.trim(),
      isPublic ? 'public' : 'private'
    );

    if (success) {
      setShowCreateProfile(false);
      setNewUsername('');
      setNewDisplayName('');
      Alert.alert('Profile Created!', 'Welcome to the community!');
    } else {
      Alert.alert('Error', 'Username may already be taken');
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.id || !newGroupName.trim()) return;

    const groupId = await createGroup(user.id, newGroupName.trim(), newGroupDescription.trim());
    if (groupId) {
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      fetchGroups();
      Alert.alert('Group Created!', 'Your group is now open for members.');
    } else {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user?.id) return;
    const success = await joinGroup(groupId, user.id);
    if (success) {
      fetchGroups();
      Alert.alert('Joined!', 'You are now a member of this group.');
    }
  };

  // If no profile, show create profile prompt
  if (!myProfile && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noProfileContainer}>
          <View style={styles.noProfileIcon}>
            <Ionicons name="people" size={64} color={colors.accent.primary} />
          </View>
          <Text style={styles.noProfileTitle}>Join the Community</Text>
          <Text style={styles.noProfileSubtitle}>
            Create your profile to connect with others, join groups, and participate in challenges
          </Text>
          <TouchableOpacity
            style={styles.createProfileButton}
            onPress={() => setShowCreateProfile(true)}
            data-testid="create-profile-btn"
          >
            <Ionicons name="person-add" size={20} color={colors.background.primary} />
            <Text style={styles.createProfileButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Create Profile Modal */}
        <Modal visible={showCreateProfile} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Your Profile</Text>
              
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Choose a unique username"
                placeholderTextColor={colors.text.tertiary}
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
              />
              
              <Text style={styles.inputLabel}>Display Name (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="How others will see you"
                placeholderTextColor={colors.text.tertiary}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
              />

              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() => setIsPublic(!isPublic)}
              >
                <View style={[styles.checkbox, isPublic && styles.checkboxChecked]}>
                  {isPublic && <Ionicons name="checkmark" size={14} color={colors.background.primary} />}
                </View>
                <View style={styles.visibilityText}>
                  <Text style={styles.visibilityTitle}>Public Profile</Text>
                  <Text style={styles.visibilityHint}>
                    Others can see your stats and achievements
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateProfile(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, !newUsername.trim() && styles.submitButtonDisabled]}
                  onPress={handleCreateProfile}
                  disabled={!newUsername.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background.primary} />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community</Text>
          {myProfile && (
            <Text style={styles.subtitle}>@{myProfile.username}</Text>
          )}
        </View>
        {myProfile && (
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{myProfile.followers_count}</Text>
              <Text style={styles.headerStatLabel}>Followers</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{myProfile.following_count}</Text>
              <Text style={styles.headerStatLabel}>Following</Text>
            </View>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['feed', 'groups', 'leaderboard'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            <Ionicons
              name={
                tab === 'feed' ? 'pulse' :
                tab === 'groups' ? 'people' : 'trophy'
              }
              size={18}
              color={activeTab === tab ? colors.accent.primary : colors.text.tertiary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      >
        {/* Activity Feed Tab */}
        {activeTab === 'feed' && (
          <View style={styles.feedContainer}>
            {activityFeed.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No activity yet</Text>
                <Text style={styles.emptyHint}>Follow users to see their achievements here</Text>
              </View>
            ) : (
              activityFeed.map(activity => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name={
                        activity.activity_type === 'achievement' ? 'trophy' :
                        activity.activity_type === 'streak' ? 'flame' :
                        activity.activity_type === 'evolution' ? 'sparkles' : 'checkmark-circle'
                      }
                      size={20}
                      color={colors.accent.primary}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityUsername}>@{activity.username}</Text>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    {activity.description && (
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <View style={styles.groupsContainer}>
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={() => setShowCreateGroup(true)}
              data-testid="create-group-btn"
            >
              <Ionicons name="add-circle" size={20} color={colors.accent.primary} />
              <Text style={styles.createGroupText}>Create a Group</Text>
            </TouchableOpacity>

            {groups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No groups yet</Text>
                <Text style={styles.emptyHint}>Be the first to create a group!</Text>
              </View>
            ) : (
              groups.map(group => (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupIcon}>
                      <Ionicons name="people" size={24} color={colors.accent.primary} />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMembers}>{group.member_count} members</Text>
                    </View>
                  </View>
                  {group.description && (
                    <Text style={styles.groupDescription}>{group.description}</Text>
                  )}
                  <View style={styles.groupStats}>
                    <View style={styles.groupStat}>
                      <Ionicons name="checkmark-done" size={14} color={colors.text.tertiary} />
                      <Text style={styles.groupStatText}>{group.total_tasks_completed} tasks</Text>
                    </View>
                    <View style={styles.groupStat}>
                      <Ionicons name="flag" size={14} color={colors.text.tertiary} />
                      <Text style={styles.groupStatText}>{group.active_challenges} challenges</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinGroup(group.id)}
                    data-testid={`join-group-${group.id}`}
                  >
                    <Text style={styles.joinButtonText}>Join Group</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardContainer}>
            {/* Category Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {['tasks', 'streak', 'trust'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, leaderboardCategory === cat && styles.categoryChipActive]}
                  onPress={() => setLeaderboardCategory(cat)}
                >
                  <Ionicons
                    name={cat === 'tasks' ? 'checkmark-done' : cat === 'streak' ? 'flame' : 'shield'}
                    size={14}
                    color={leaderboardCategory === cat ? colors.background.primary : colors.text.secondary}
                  />
                  <Text style={[styles.categoryText, leaderboardCategory === cat && styles.categoryTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No rankings yet</Text>
                <Text style={styles.emptyHint}>Complete tasks to appear on the leaderboard</Text>
              </View>
            ) : (
              leaderboard.map((entry, index) => (
                <View key={entry.user_id} style={styles.leaderboardEntry}>
                  <View style={[styles.rankBadge, index < 3 && styles.topRankBadge]}>
                    <Text style={[styles.rankText, index < 3 && styles.topRankText]}>
                      {entry.rank}
                    </Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryUsername}>@{entry.username}</Text>
                    <View style={styles.entryTier}>
                      <View style={[styles.tierDot, { backgroundColor: EVOLUTION_COLORS[entry.evolution_tier] || colors.accent.primary }]} />
                      <Text style={styles.tierText}>{entry.evolution_tier}</Text>
                    </View>
                  </View>
                  <View style={styles.entryValue}>
                    <Text style={styles.entryValueText}>
                      {entry[leaderboardCategory === 'trust' ? 'trust_score' : 
                        leaderboardCategory === 'streak' ? 'current_streak' : 'total_tasks_completed']}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Group</Text>
            
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter group name"
              placeholderTextColor={colors.text.tertiary}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What's this group about?"
              placeholderTextColor={colors.text.tertiary}
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateGroup(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !newGroupName.trim() && styles.submitButtonDisabled]}
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <Text style={styles.submitButtonText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.accent.primary,
    marginTop: 2,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerStatLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.accent.soft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.accent.primary,
  },
  content: {
    flex: 1,
  },
  // No Profile State
  noProfileContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noProfileIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noProfileTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  noProfileSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createProfileButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
    ...shadows.glow,
  },
  createProfileButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  visibilityText: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  visibilityHint: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.border.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Feed
  feedContainer: {
    paddingHorizontal: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  // Groups
  groupsContainer: {
    paddingHorizontal: 16,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.soft,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createGroupText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  groupCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  groupMembers: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  groupStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  groupStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupStatText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  joinButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Leaderboard
  leaderboardContainer: {
    paddingHorizontal: 16,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.accent.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.background.primary,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRankBadge: {
    backgroundColor: colors.accent.primary,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  topRankText: {
    color: colors.background.primary,
  },
  entryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entryUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  entryTier: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  entryValue: {
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  entryValueText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
  },
});
