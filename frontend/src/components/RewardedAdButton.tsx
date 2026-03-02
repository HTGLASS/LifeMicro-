import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface Props {
  onRewardEarned: (amount: number) => void;
  bonusAmount?: number;
}

// This is a placeholder component for development and web preview
// Real rewarded ads work only in native builds
export default function RewardedAdButton({ onRewardEarned, bonusAmount = 25 }: Props) {
  return (
    <View style={styles.webPlaceholder}>
      <Ionicons name="play-circle" size={20} color={colors.status.warning} />
      <Text style={styles.webPlaceholderText}>
        Watch Ad for +{bonusAmount} MICO (Available in mobile app)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.3)',
    borderStyle: 'dashed',
  },
  webPlaceholderText: {
    color: colors.status.warning,
    fontSize: 13,
    fontWeight: '600',
  },
});
