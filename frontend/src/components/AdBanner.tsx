import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdBannerProps {
  type?: 'small' | 'medium' | 'large';
}

export default function AdBanner({ type = 'small' }: AdBannerProps) {
  // This is a placeholder for Google AdMob integration
  // Once you set up AdMob, replace this with actual ad component

  const height = type === 'small' ? 50 : type === 'medium' ? 90 : 250;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.content}>
        <Ionicons name="megaphone-outline" size={20} color="#6B7280" />
        <Text style={styles.text}>Ad Space</Text>
      </View>
      <Text style={styles.subtext}>Sponsored content will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: '#4B5563',
    fontSize: 11,
    marginTop: 4,
  },
});
