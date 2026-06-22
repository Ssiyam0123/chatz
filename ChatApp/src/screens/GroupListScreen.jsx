import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { getMyGroups } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/ui/Avatar';
import ListRow from '../components/ui/ListRow';
import EmptyState from '../components/ui/EmptyState';

export default function GroupListScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
    const unsubscribe = navigation.addListener('focus', loadGroups);
    return unsubscribe;
  }, [navigation]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await getMyGroups();
      setGroups(res.data.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <ListRow
      avatar={
        <Avatar uri={item.avatar} name={item.name} size="md" />
      }
      title={item.name}
      subtitle={`${item.members?.length ?? 0} member${item.members?.length !== 1 ? 's' : ''}`}
      onPress={() =>
        navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })
      }
      trailing={
        <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
      }
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading && groups.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={loadGroups}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No groups yet"
              message="You're not in any groups yet. Create one to get started!"
            />
          }
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});