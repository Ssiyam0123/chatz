import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../stores/authStore';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatScreen from '../screens/ChatScreen';
import GroupListScreen from '../screens/GroupListScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { colors } = useTheme();
  const { token, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  const defaultStackOptions = {
    headerStyle: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    headerTintColor: colors.text,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 17,
      color: colors.text,
    },
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen 
            name="ChatDetail" 
            component={ChatScreen} 
            options={({ route }) => ({ title: route.params.userName })} 
          />
          <Stack.Screen 
            name="GroupChat" 
            component={GroupChatScreen} 
            options={({ route }) => ({ title: route.params.groupName })} 
          />
          <Stack.Screen 
            name="GroupDetails" 
            component={GroupDetailsScreen} 
            options={{ title: 'Group Info' }} 
          />
          <Stack.Screen 
            name="CreateGroup" 
            component={CreateGroupScreen} 
            options={{ title: 'New Group' }} 
          />
          <Stack.Screen 
            name="GroupList" 
            component={GroupListScreen} 
            options={{ title: 'My Groups' }} 
          />
          <Stack.Screen 
            name="UserProfile" 
            component={ProfileScreen} 
            options={{ title: 'Profile' }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
}