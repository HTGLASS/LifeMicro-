import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';

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
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="rocket" size={56} color="#F9FAFB" />
        </View>

        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>Here's your personalized plan:</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="flag-outline" size={20} color="#6366F1" />
            <Text style={styles.summaryLabel}>Your Goals</Text>
            <Text style={styles.summaryValue}>
              {goals.length} selected
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={20} color="#F59E0B" />
            <Text style={styles.summaryLabel}>Best Time</Text>
            <Text style={styles.summaryValue}>
              {productiveTime.charAt(0).toUpperCase() + productiveTime.slice(1)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Ionicons name="hourglass-outline" size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Daily Time</Text>
            <Text style={styles.summaryValue}>{availableTime}</Text>
          </View>
        </View>

        {/* Bonus Info */}
        <View style={styles.bonusCard}>
          <Ionicons name="gift" size={24} color="#F59E0B" />
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
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Start My Journey</Text>
              <Ionicons name="sparkles" size={20} color="#FFF" />
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
    paddingTop: 48,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 14,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  bonusText: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  bonusDesc: {
    fontSize: 14,
    color: '#FCD34D',
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
