import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { colors, shadows } from '../../src/constants/theme';

const PRODUCTIVE_TIMES = [
  { id: 'morning', label: 'Morning', desc: '6am - 12pm', icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Afternoon', desc: '12pm - 6pm', icon: 'partly-sunny-outline' },
  { id: 'evening', label: 'Evening', desc: '6pm - 10pm', icon: 'moon-outline' },
  { id: 'night', label: 'Night', desc: '10pm - 6am', icon: 'cloudy-night-outline' },
];

const AVAILABLE_TIMES = [
  { id: '5min', label: '5 minutes', desc: 'Quick wins' },
  { id: '15min', label: '15 minutes', desc: 'Short burst' },
  { id: '30min', label: '30 minutes', desc: 'Focused session' },
  { id: '60min', label: '1 hour+', desc: 'Deep work' },
];

export default function TimeScreen() {
  const router = useRouter();
  const { updatePreferences } = useUserStore();
  const [productiveTime, setProductiveTime] = useState<string | null>(null);
  const [availableTime, setAvailableTime] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!productiveTime || !availableTime) return;
    await updatePreferences({
      productive_time: productiveTime,
      available_time: availableTime,
    });
    router.push('/(onboarding)/ready');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: '66%' }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Productive Time */}
        <Text style={styles.title}>When are you most productive?</Text>
        <Text style={styles.subtitle}>We'll send tasks at your peak times.</Text>

        <View style={styles.optionsGrid}>
          {PRODUCTIVE_TIMES.map(time => {
            const isSelected = productiveTime === time.id;
            return (
              <TouchableOpacity
                key={time.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => setProductiveTime(time.id)}
              >
                <Ionicons
                  name={time.icon as any}
                  size={28}
                  color={isSelected ? colors.accent.primary : colors.text.secondary}
                />
                <Text style={[styles.optionLabel, isSelected && styles.labelSelected]}>
                  {time.label}
                </Text>
                <Text style={styles.optionDesc}>{time.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Available Time */}
        <Text style={[styles.title, { marginTop: 32 }]}>How much time can you dedicate?</Text>
        <Text style={styles.subtitle}>Per day, on average.</Text>

        <View style={styles.timeOptions}>
          {AVAILABLE_TIMES.map(time => {
            const isSelected = availableTime === time.id;
            return (
              <TouchableOpacity
                key={time.id}
                style={[
                  styles.timeCard,
                  isSelected && styles.timeSelected,
                ]}
                onPress={() => setAvailableTime(time.id)}
              >
                <Text style={[styles.timeLabel, isSelected && styles.labelSelected]}>
                  {time.label}
                </Text>
                <Text style={styles.timeDesc}>{time.desc}</Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={16} color={colors.background.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!productiveTime || !availableTime) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!productiveTime || !availableTime}
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 8,
  },
  optionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  optionDesc: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  labelSelected: {
    color: colors.accent.primary,
  },
  timeOptions: {
    gap: 12,
    paddingBottom: 24,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  timeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timeDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 8,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
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
