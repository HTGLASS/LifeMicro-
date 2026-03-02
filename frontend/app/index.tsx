import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect based on user state in _layout.tsx
  return (
    <View style={styles.container}>
      <Redirect href="/(onboarding)/welcome" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
