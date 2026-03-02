import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { colors, shadows } from '../../src/constants/theme';

const GOALS = [
  { id: 'fitness', label: 'Fitness', icon: 'fitness', color: colors.goals.fitness },
  { id: 'focus', label: 'Focus & Productivity', icon: 'bulb', color: colors.goals.focus },
  { id: 'business', label: 'Business & Career', icon: 'briefcase', color: colors.goals.business },
  { id: 'relationships', label: 'Relationships', icon: 'heart', color: colors.goals.relationships },
  { id: 'spiritual', label: 'Spiritual Growth', icon: 'leaf', color: colors.goals.spiritual },
  { id: 'creativity', label: 'Creativity', icon: 'color-palette', color: colors.goals.creativity },
  { id: 'health', label: 'Health & Wellness', icon: 'medical', color: colors.goals.health },
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
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
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
                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
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
          <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: {
    height: 4,
    backgroundColor: colors.background.secondary,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent.primary,
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
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
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
    backgroundColor: colors.background.secondary,
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
    color: colors.text.primary,
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
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.glow,
  },
  buttonDisabled: {
    backgroundColor: colors.border.primary,
    shadowColor: 'transparent',
  },
  buttonText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
