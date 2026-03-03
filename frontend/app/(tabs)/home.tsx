import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useTaskStore } from '../../src/store/taskStore';
import { useWalletStore } from '../../src/store/walletStore';
import TaskCard from '../../src/components/TaskCard';
import AdBanner from '../../src/components/AdBanner';
import CelebrationModal from '../../src/components/CelebrationModal';
import RewardedAdButton from '../../src/components/RewardedAdButton';
import VerificationModal from '../../src/components/VerificationModal';
import { colors, shadows } from '../../src/constants/theme';
import { TaskCompleteResponse } from '../../src/types/character';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  const { user } = useUserStore();
  const { tasks, contextQuestion, activeTask, isLoading, isGenerating, fetchTasks, fetchContextQuestion, generateTasks, startTask, completeTask, skipTask, clearActiveTask } = useTaskStore();
  const { wallet, fetchWallet } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    visible: boolean;
    tokensEarned: number;
    streakBonus: number;
    newBalance: number;
    trustChange?: number;
    validationStatus?: string;
  }>({ visible: false, tokensEarned: 0, streakBonus: 0, newBalance: 0 });

  useEffect(() => {
    if (user?.id) {
      fetchTasks(user.id);
      fetchWallet(user.id);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.all([fetchTasks(user.id), fetchWallet(user.id)]);
    setRefreshing(false);
  }, [user?.id]);

  // Handle reward from watching ad
  const handleAdReward = async (amount: number) => {
    if (!user?.id) return;
    
    // Award bonus tokens via backend
    try {
      // For now, we'll show a celebration - in production, you'd call a backend endpoint
      setCelebrationData({
        visible: true,
        tokensEarned: amount,
        streakBonus: 0,
        newBalance: (wallet?.balance || 0) + amount,
      });
      // Refresh wallet after a short delay
      setTimeout(() => fetchWallet(user.id), 1000);
    } catch (error) {
      console.error('Error awarding ad reward:', error);
    }
  };

  const handleGetTasks = async () => {
    if (!user?.id) return;
    await fetchContextQuestion(user.id);
    setShowContextModal(true);
  };

  const handleGenerateTasks = async () => {
    if (!user?.id) return;
    setShowContextModal(false);
    
    const context = selectedAnswer && contextQuestion
      ? { question: contextQuestion.question, answer: selectedAnswer }
      : undefined;
    
    await generateTasks(user.id, context);
    setSelectedAnswer(null);
  };

  const handleCompleteTask = async (taskId: string) => {
    setProcessingTaskId(taskId);
    
    // Step 1: Start the task (for anti-cheat time tracking)
    const startResult = await startTask(taskId);
    
    if (startResult) {
      // Show verification modal with timer
      setShowVerificationModal(true);
    } else {
      // Fallback: If start fails, try direct completion (legacy behavior)
      const result = await completeTask(taskId);
      setProcessingTaskId(null);

      if (result) {
        setCelebrationData({
          visible: true,
          tokensEarned: result.tokens_earned,
          streakBonus: result.streak_bonus,
          newBalance: result.new_balance,
          trustChange: result.trust_change,
          validationStatus: result.validation_status,
        });
      }
    }
  };

  const handleVerificationSubmit = async (verificationResponse: any, reflectionText?: string) => {
    if (!activeTask) return;
    
    const result = await completeTask(activeTask.taskId, verificationResponse, reflectionText);
    setShowVerificationModal(false);
    setProcessingTaskId(null);

    if (result) {
      setCelebrationData({
        visible: true,
        tokensEarned: result.tokens_earned,
        streakBonus: result.streak_bonus,
        newBalance: result.new_balance,
        trustChange: result.trust_change,
        validationStatus: result.validation_status,
      });
    }
  };

  const handleVerificationSkip = async () => {
    if (!activeTask) return;
    
    // Complete without verification (may get reduced rewards)
    const result = await completeTask(activeTask.taskId);
    setShowVerificationModal(false);
    setProcessingTaskId(null);

    if (result) {
      setCelebrationData({
        visible: true,
        tokensEarned: result.tokens_earned,
        streakBonus: result.streak_bonus,
        newBalance: result.new_balance,
        trustChange: result.trust_change,
        validationStatus: result.validation_status,
      });
    }
  };

  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    setProcessingTaskId(null);
    clearActiveTask();
  };

  const handleSkipTask = async (taskId: string) => {
    setProcessingTaskId(taskId);
    await skipTask(taskId);
    setProcessingTaskId(null);
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name || 'Champion'}!
          </Text>
          <Text style={styles.subtitle}>Your daily micro-wins await</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={18} color={colors.status.warning} />
          <Text style={styles.streakText}>{user?.streak_count || 0}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceLeft}>
          <Text style={styles.balanceLabel}>MICO Balance</Text>
          <Text style={styles.balanceValue}>{wallet?.balance || 0}</Text>
        </View>
        <View style={styles.balanceRight}>
          <Ionicons name="trending-up" size={20} color={colors.accent.primary} />
          <Text style={styles.earnedText}>+{wallet?.total_earned || 0} earned</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Tasks Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <Text style={styles.taskCount}>{pendingTasks.length} pending</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : pendingTasks.length > 0 ? (
          <>
            {pendingTasks.map((task, index) => (
              <React.Fragment key={task.id}>
                <TaskCard
                  task={task}
                  onComplete={() => handleCompleteTask(task.id)}
                  onSkip={() => handleSkipTask(task.id)}
                  isProcessing={processingTaskId === task.id}
                />
                {index === 0 && pendingTasks.length > 1 && <AdBanner type="small" />}
              </React.Fragment>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="sparkles" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Ready for a challenge?</Text>
            <Text style={styles.emptyText}>
              Get personalized micro-tasks based on how you're feeling right now.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGetTasks}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color={colors.background.primary} />
                  <Text style={styles.generateButtonText}>Get My Tasks</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rewarded Ad - Watch for bonus tokens */}
        <RewardedAdButton onRewardEarned={handleAdReward} bonusAmount={25} />

        {/* Bottom Ad */}
        <AdBanner type="medium" />

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Context Question Modal */}
      <Modal visible={showContextModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {contextQuestion?.question || 'How are you feeling?'}
            </Text>
            <View style={styles.optionsContainer}>
              {contextQuestion?.options.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedAnswer === option && styles.optionSelected,
                  ]}
                  onPress={() => setSelectedAnswer(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedAnswer === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.skipModalButton}
                onPress={() => {
                  setShowContextModal(false);
                  setSelectedAnswer(null);
                  if (user?.id) generateTasks(user.id);
                }}
              >
                <Text style={styles.skipModalText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueButton, !selectedAnswer && styles.buttonDisabled]}
                onPress={handleGenerateTasks}
                disabled={!selectedAnswer}
              >
                <Text style={styles.continueText}>Generate Tasks</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerificationModal}
        verification={activeTask?.verification || null}
        minCompletionTime={activeTask?.minCompletionTime || 0}
        startedAt={activeTask?.startedAt || ''}
        onSubmit={handleVerificationSubmit}
        onSkip={handleVerificationSkip}
        onCancel={handleVerificationCancel}
      />

      {/* Celebration Modal */}
      <CelebrationModal
        visible={celebrationData.visible}
        onClose={() => {
          setCelebrationData({ ...celebrationData, visible: false });
          if (user?.id) fetchWallet(user.id);
        }}
        tokensEarned={celebrationData.tokensEarned}
        streakBonus={celebrationData.streakBonus}
        newBalance={celebrationData.newBalance}
      />
    </SafeAreaView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.status.warning,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  balanceLeft: {},
  balanceLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  balanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earnedText: {
    fontSize: 14,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  taskCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.soft,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...shadows.glow,
  },
  generateButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
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
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: colors.background.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipModalButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipModalText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.border.primary,
  },
  continueText: {
    fontSize: 16,
    color: colors.background.primary,
    fontWeight: '700',
  },
});
