import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'group') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f4511e',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Chat',
          headerTitle: 'Messages'
        }} 
      />
      <Tabs.Screen 
        name="group" 
        options={{ 
          title: 'Group',
          headerTitle: 'Group'
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          headerTitle: 'Profile'
        }} 
      />
     
      <Tabs.Screen 
        name="[id]" 
        options={{ 
          href: null, 
          headerShown: true,
        }} 
      />
    </Tabs>
  );
}