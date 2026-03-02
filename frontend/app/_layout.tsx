import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useUserStore } from '../src/store/userStore';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const { user, isLoading, initializeUser } = useUserStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeUser().then(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady && user) {
      if (!user.onboarding_completed) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [isReady, user]);

  if (isLoading || !isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
