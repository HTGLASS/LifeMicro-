import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// AdMob imports - only work in native builds
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

try {
  const AdMob = require('react-native-google-mobile-ads');
  RewardedAd = AdMob.RewardedAd;
  RewardedAdEventType = AdMob.RewardedAdEventType;
  TestIds = AdMob.TestIds;
} catch (e) {
  // AdMob not available (web preview)
}

// Rewarded Ad Unit IDs
const REWARDED_AD_IDS = {
  ios: 'ca-app-pub-3008579178451093/5253805299',
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Add your Android rewarded ad unit ID here
};

interface Props {
  onRewardEarned: (amount: number) => void;
  bonusAmount?: number;
}

export default function RewardedAdButton({ onRewardEarned, bonusAmount = 25 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rewarded, setRewarded] = useState<any>(null);

  useEffect(() => {
    // Don't initialize on web or if AdMob isn't available
    if (Platform.OS === 'web' || !RewardedAd) {
      return;
    }

    // Use test IDs in development, real IDs in production
    const adUnitId = __DEV__
      ? TestIds.REWARDED
      : Platform.select({
          ios: REWARDED_AD_IDS.ios,
          android: REWARDED_AD_IDS.android,
        });

    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setLoaded(true);
        setLoading(false);
      }
    );

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward: any) => {
        console.log('User earned reward:', reward);
        onRewardEarned(bonusAmount);
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      'closed',
      () => {
        // Reload ad for next time
        setLoaded(false);
        setLoading(true);
        rewardedAd.load();
      }
    );

    // Load the ad
    setLoading(true);
    rewardedAd.load();
    setRewarded(rewardedAd);

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, []);

  const showAd = async () => {
    if (loaded && rewarded) {
      await rewarded.show();
    }
  };

  // Show placeholder on web
  if (Platform.OS === 'web' || !RewardedAd) {
    return (
      <View style={styles.webPlaceholder}>
        <Ionicons name="play-circle" size={20} color="#F59E0B" />
        <Text style={styles.webPlaceholderText}>
          Watch Ad for +{bonusAmount} MICO (Available in mobile app)
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
        <ActivityIndicator color="#FFF" size="small" />
        <Text style={styles.buttonText}>Loading Ad...</Text>
      </TouchableOpacity>
    );
  }

  if (!loaded) {
    return null; // Don't show button if ad isn't ready
  }

  return (
    <TouchableOpacity style={styles.button} onPress={showAd}>
      <Ionicons name="play-circle" size={20} color="#FFF" />
      <Text style={styles.buttonText}>Watch Ad for +{bonusAmount} MICO</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  webPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B20',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderStyle: 'dashed',
  },
  webPlaceholderText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
});
