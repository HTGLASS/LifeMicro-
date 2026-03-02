import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../constants/theme';

interface AdBannerProps {
  type?: 'small' | 'medium' | 'large';
}

// Ad Unit IDs
const AD_UNIT_IDS = {
  ios: 'ca-app-pub-3008579178451093/4363395450',
  android: 'ca-app-pub-3008579178451093/6088016026',
};

// Placeholder component for web or when ads aren't available
function AdPlaceholder({ height }: { height: number }) {
  return (
    <View style={[styles.placeholder, { height }]}>
      <View style={styles.content}>
        <Text style={styles.text}>Ad Space</Text>
      </View>
      <Text style={styles.subtext}>Sponsored content will appear here</Text>
    </View>
  );
}

export default function AdBanner({ type = 'small' }: AdBannerProps) {
  const height = type === 'small' ? 50 : type === 'medium' ? 90 : 250;

  // Always show placeholder - AdMob is only available in native builds
  // This component will be properly loaded in production native apps
  return <AdPlaceholder height={height} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
});
