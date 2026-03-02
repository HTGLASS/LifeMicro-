import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon Area with Glow Effect */}
        <View style={styles.logoContainer}>
          <View style={styles.glowRing}>
            <View style={styles.iconWrapper}>
              <Ionicons name="sparkles" size={48} color={colors.text.primary} />
            </View>
          </View>
          <Text style={styles.appName}>LifeMicro</Text>
          <Text style={styles.tagline}>Small wins, big changes</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accent.soft }]}>
              <Ionicons name="bulb-outline" size={24} color={colors.accent.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI-Powered Tasks</Text>
              <Text style={styles.featureDesc}>Get personalized micro-actions tailored to your goals</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 181, 71, 0.15)' }]}>
              <Ionicons name="trophy-outline" size={24} color={colors.status.warning} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Earn Rewards</Text>
              <Text style={styles.featureDesc}>Complete tasks to earn MICO tokens</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accent.soft }]}>
              <Ionicons name="gift-outline" size={24} color={colors.accent.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Redeem Prizes</Text>
              <Text style={styles.featureDesc}>Use tokens for discounts, gifts & more</Text>
            </View>
          </View>
        </View>

        {/* CTA Button with Glow */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(onboarding)/goals')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Free forever. No credit card required.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  glowRing: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.glow,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
  },
  features: {
    gap: 20,
    marginBottom: 48,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: colors.text.secondary,
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
  disclaimer: {
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 16,
  },
});
