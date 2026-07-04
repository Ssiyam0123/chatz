import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; 
import { View, StyleSheet, Platform } from 'react-native';
import FeedScreen from '../screens/FeedScreen';
import ChatListScreen from '../screens/ChatListScreen';
import PeopleScreen from '../screens/PeopleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import useChatStore from '../stores/chatStore';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

import Avatar from '../components/ui/Avatar';

import { useAuthStore } from '../stores/authStore';

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  const conversations = useChatStore((state) => state.conversations);
  const friendRequests = useChatStore((state) => state.friendRequests);
  const totalUnreadCount = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
  const pendingRequestsCount = friendRequests.filter(
    (r) => (r.receiver?._id || r.receiver?.id || r.receiver) === currentUserId && r.status === 'pending'
  ).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Profile') {
            return (
              <View style={{
                width: size + 4,
                height: size + 4,
                borderRadius: (size + 4) / 2,
                borderWidth: focused ? 2 : 1,
                borderColor: focused ? colors.primary : colors.border,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Avatar uri={user?.avatar} name={user?.name} size="sm" />
              </View>
            );
          }
          let iconName;
          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primaryPressed,
          fontSize: 11,
          fontWeight: '700',
          color: colors.white,
        },
        headerShown: false,
        lazy: true,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Feed' }} />
      <Tab.Screen 
        name="Friends" 
        component={PeopleScreen} 
        options={{ 
          title: 'Friends',
          tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
        }} 
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatListScreen} 
        options={{ 
          title: 'Chats',
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined
        }} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}