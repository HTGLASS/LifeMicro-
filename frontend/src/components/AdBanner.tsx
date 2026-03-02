import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// AdMob imports - only work in native builds
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const AdMob = require('react-native-google-mobile-ads');
  BannerAd = AdMob.BannerAd;
  BannerAdSize = AdMob.BannerAdSize;
  TestIds = AdMob.TestIds;
} catch (e) {
  // AdMob not available (web preview)
}

interface AdBannerProps {
  type?: 'small' | 'medium' | 'large';
}

// Ad Unit IDs
const AD_UNIT_IDS = {
  ios: 'ca-app-pub-3008579178451093/4363395450',
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Add your Android ad unit ID here
};

export default function AdBanner({ type = 'small' }: AdBannerProps) {
  const [adError, setAdError] = useState(false);

  const height = type === 'small' ? 50 : type === 'medium' ? 90 : 250;

  // Show placeholder on web or if AdMob isn't available
  if (Platform.OS === 'web' || !BannerAd || adError) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <View style={styles.content}>
          <Text style={styles.text}>Ad Space</Text>
        </View>
        <Text style={styles.subtext}>Sponsored content will appear here</Text>
      </View>
    );
  }

  // Use test IDs in development, real IDs in production
  const adUnitId = __DEV__ 
    ? TestIds.BANNER 
    : Platform.select({
        ios: AD_UNIT_IDS.ios,
        android: AD_UNIT_IDS.android,
      });

  const adSize = type === 'small' 
    ? BannerAdSize.BANNER 
    : type === 'medium' 
    ? BannerAdSize.MEDIUM_RECTANGLE 
    : BannerAdSize.LARGE_BANNER;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('Ad failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  placeholder: {
    backgroundColor: '#1E293B',
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
