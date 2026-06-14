import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { colors, radii, spacing } from '../theme/blushDusk';
import Avatar from '../components/ui/Avatar';
import ListRow from '../components/ui/ListRow';
import EmptyState from '../components/ui/EmptyState';

export default function UsersScreen({ navigation }) {
  const { users, isLoadingUsers, fetchUsers } = useChatStore();
  const currentUserId = useAuthStore((state) => state.user?.id || state.user?._id);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: spacing.lg }}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ],
      { cancelable: true }
    );
  };

  const filteredUsers = users.filter((u) => (u.id || u._id) !== currentUserId);

  const renderItem = ({ item }) => (
    <ListRow
      avatar={
        <Avatar uri={item.avatar} name={item.name} size="md" />
      }
      title={item.name}
      subtitle={item.email}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id || item._id })}
    />
  );

  if (isLoadingUsers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No users found"
            message="There are no other users to discover yet."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});