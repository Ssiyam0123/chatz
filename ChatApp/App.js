import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import useChatStore from './src/stores/chatStore';
import { ActivityIndicator, View } from 'react-native';

export default function App() {
  const { isHydrated, token, user } = useAuthStore();
  const initChat = useChatStore(state => state.init);
  const disconnectChat = useChatStore(state => state.disconnect);

  useEffect(() => {
    if (isHydrated && token && user) {
      initChat(token, user);
    } else if (isHydrated && !token) {
      disconnectChat();
    }
  }, [isHydrated, token, user, initChat, disconnectChat]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', height: '100vh' }}>
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