import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import useChatStore from './src/stores/chatStore';
import { ActivityIndicator, View } from 'react-native';

import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  const { isHydrated, token, user } = useAuthStore();
  const initChat = useChatStore(state => state.init);
  const disconnectChat = useChatStore(state => state.disconnect);

  useEffect(() => {
    // If user object is corrupted (missing ID), force logout to clear bad state
    if (isHydrated && user && !user.id && !user._id) {
      console.warn('Corrupted user state detected. Forcing logout...');
      useAuthStore.getState().logout();
      return;
    }

    if (isHydrated && token && user) {
      initChat(token, user);
    } else if (isHydrated && !token) {
      disconnectChat();
    }
  }, [isHydrated, token, user, initChat, disconnectChat]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', height: '100%' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}