import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../constants/theme';

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  tokensEarned: number;
  streakBonus?: number;
  newBalance: number;
}

export default function CelebrationModal({
  visible,
  onClose,
  tokensEarned,
  streakBonus = 0,
  newBalance,
}: CelebrationModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.accent.primary} />
          </View>

          <Text style={styles.title}>Great Job!</Text>
          <Text style={styles.subtitle}>Task Completed</Text>

          <View style={styles.rewardContainer}>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Tokens Earned</Text>
              <Text style={styles.rewardValue}>+{tokensEarned} MICO</Text>
            </View>

            {streakBonus > 0 && (
              <View style={styles.rewardRow}>
                <Text style={styles.bonusLabel}>Streak Bonus!</Text>
                <Text style={styles.bonusValue}>+{streakBonus} MICO</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>New Balance</Text>
              <Text style={styles.balanceValue}>{newBalance} MICO</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.soft,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  rewardContainer: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  bonusLabel: {
    fontSize: 14,
    color: colors.status.warning,
  },
  bonusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.status.warning,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    ...shadows.glow,
  },
  buttonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
