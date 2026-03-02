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

export default function HomeScreen() {
  const { user } = useUserStore();
  const { tasks, contextQuestion, isLoading, isGenerating, fetchTasks, fetchContextQuestion, generateTasks, completeTask, skipTask } = useTaskStore();
  const { wallet, fetchWallet } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    visible: boolean;
    tokensEarned: number;
    streakBonus: number;
    newBalance: number;
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
    const result = await completeTask(taskId);
    setProcessingTaskId(null);

    if (result) {
      setCelebrationData({
        visible: true,
        tokensEarned: result.tokens_earned,
        streakBonus: result.streak_bonus,
        newBalance: result.new_balance,
      });
    }
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
          <Ionicons name="flame" size={18} color="#F59E0B" />
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
          <Ionicons name="trending-up" size={20} color="#10B981" />
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
            tintColor="#6366F1"
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
            <ActivityIndicator size="large" color="#6366F1" />
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
            <Ionicons name="sparkles" size={48} color="#6366F1" />
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
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#FFF" />
                  <Text style={styles.generateButtonText}>Get My Tasks</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

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
    backgroundColor: '#0F172A',
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
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  balanceLeft: {},
  balanceLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  balanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earnedText: {
    fontSize: 14,
    color: '#10B981',
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
    color: '#F9FAFB',
  },
  taskCount: {
    fontSize: 14,
    color: '#9CA3AF',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F115',
  },
  optionText: {
    fontSize: 16,
    color: '#F9FAFB',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#6366F1',
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
    color: '#9CA3AF',
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  continueText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
});
