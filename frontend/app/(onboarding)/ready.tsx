import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { colors, shadows } from '../../src/constants/theme';

export default function ReadyScreen() {
  const router = useRouter();
  const { user, completeOnboarding } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    await completeOnboarding();
    router.replace('/(tabs)/home');
  };

  const goals = user?.preferences?.goals || [];
  const productiveTime = user?.preferences?.productive_time || 'anytime';
  const availableTime = user?.preferences?.available_time || '15min';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="rocket" size={56} color={colors.background.primary} />
        </View>

        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>Here's your personalized plan:</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="flag-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.summaryLabel}>Your Goals</Text>
            <Text style={styles.summaryValue}>
              {goals.length} selected
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={20} color={colors.status.warning} />
            <Text style={styles.summaryLabel}>Best Time</Text>
            <Text style={styles.summaryValue}>
              {productiveTime.charAt(0).toUpperCase() + productiveTime.slice(1)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="hourglass-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.summaryLabel}>Daily Time</Text>
            <Text style={styles.summaryValue}>{availableTime}</Text>
          </View>
        </View>

        {/* Bonus Info */}
        <View style={styles.bonusCard}>
          <Ionicons name="gift" size={24} color={colors.status.warning} />
          <View style={styles.bonusText}>
            <Text style={styles.bonusTitle}>Welcome Bonus!</Text>
            <Text style={styles.bonusDesc}>Complete your first task to earn 50 MICO</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background.primary} />
          ) : (
            <>
              <Text style={styles.buttonText}>Start My Journey</Text>
              <Ionicons name="sparkles" size={20} color={colors.background.primary} />
            </>
          )}
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
    paddingTop: 48,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    ...shadows.glow,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: 14,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 181, 71, 0.1)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.25)',
  },
  bonusText: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.status.warning,
    marginBottom: 2,
  },
  bonusDesc: {
    fontSize: 14,
    color: colors.status.warning,
    opacity: 0.8,
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
  buttonText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
