import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MicroTask } from '../types';
import { colors, shadows } from '../constants/theme';

interface TaskCardProps {
  task: MicroTask;
  onComplete: () => void;
  onSkip: () => void;
  isProcessing?: boolean;
}

const GOAL_COLORS: Record<string, string> = {
  fitness: colors.goals.fitness,
  focus: colors.goals.focus,
  business: colors.goals.business,
  relationships: colors.goals.relationships,
  spiritual: colors.goals.spiritual,
  creativity: colors.goals.creativity,
  health: colors.goals.health,
};

const GOAL_ICONS: Record<string, string> = {
  fitness: 'fitness',
  focus: 'bulb',
  business: 'briefcase',
  relationships: 'heart',
  spiritual: 'leaf',
  creativity: 'color-palette',
  health: 'medical',
};

export default function TaskCard({ task, onComplete, onSkip, isProcessing }: TaskCardProps) {
  const goalColor = GOAL_COLORS[task.goal_category] || colors.accent.primary;
  const goalIcon = GOAL_ICONS[task.goal_category] || 'checkmark-circle';

  return (
    <View style={[styles.card, { borderLeftColor: goalColor }]}>
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: goalColor + '20' }]}>
          <Ionicons name={goalIcon as any} size={14} color={goalColor} />
          <Text style={[styles.categoryText, { color: goalColor }]}>
            {task.goal_category}
          </Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>+{task.reward_amount} MICO</Text>
        </View>
      </View>

      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.description}>{task.description}</Text>

      <View style={styles.footer}>
        <View style={styles.timeEstimate}>
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.timeText}>{task.time_estimate}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isProcessing}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: goalColor }]}
            onPress={onComplete}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark" size={20} color={colors.background.primary} />
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rewardBadge: {
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardText: {
    color: colors.accent.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipText: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  doneText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
