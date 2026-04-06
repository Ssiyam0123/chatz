import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { initSocket, disconnectSocket } from './src/utils/socket';
import { ActivityIndicator, View } from 'react-native';

export default function App() {
  const { token, user, isHydrated, setHasHydrated } = useAuthStore();

  useEffect(() => {
    // সকেট কানেকশন লজিক
    if (isHydrated && token && user) {
      initSocket(token);
    } else if (isHydrated && !token) {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [isHydrated, token, user]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}