import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';

const GOALS = [
  { id: 'fitness', label: 'Fitness', icon: 'fitness', color: '#10B981' },
  { id: 'focus', label: 'Focus & Productivity', icon: 'bulb', color: '#6366F1' },
  { id: 'business', label: 'Business & Career', icon: 'briefcase', color: '#F59E0B' },
  { id: 'relationships', label: 'Relationships', icon: 'heart', color: '#EC4899' },
  { id: 'spiritual', label: 'Spiritual Growth', icon: 'leaf', color: '#8B5CF6' },
  { id: 'creativity', label: 'Creativity', icon: 'color-palette', color: '#F97316' },
  { id: 'health', label: 'Health & Wellness', icon: 'medical', color: '#14B8A6' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { updatePreferences } = useUserStore();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = async () => {
    if (selectedGoals.length === 0) return;
    await updatePreferences({ goals: selectedGoals });
    router.push('/(onboarding)/time');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: '33%' }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What do you want to improve?</Text>
        <Text style={styles.subtitle}>Select all that apply. We'll personalize your micro-tasks.</Text>

        <View style={styles.goalsGrid}>
          {GOALS.map(goal => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  isSelected && { borderColor: goal.color, backgroundColor: goal.color + '15' },
                ]}
                onPress={() => toggleGoal(goal.id)}
              >
                <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                  <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                </View>
                <Text style={[styles.goalLabel, isSelected && { color: goal.color }]}>
                  {goal.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: goal.color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, selectedGoals.length === 0 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selectedGoals.length === 0}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    lineHeight: 24,
  },
  goalsGrid: {
    gap: 12,
    paddingBottom: 24,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
