import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  rewardContainer: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  bonusLabel: {
    fontSize: 14,
    color: '#F59E0B',
  },
  bonusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
