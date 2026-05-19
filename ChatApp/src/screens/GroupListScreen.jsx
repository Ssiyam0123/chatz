import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { getMyGroups } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

export default function GroupListScreen({ navigation }) {
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
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() =>
        navigation.navigate('GroupChat', { groupId: item._id, groupName: item.name })
      }
      activeOpacity={0.7}
    >
      {/* BUG FIX: separate Image style from placeholder View style */}
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.members?.length ?? 0} member{item.members?.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading && groups.length === 0 ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={loadGroups}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>You're not in any groups yet.</Text>
              <Text style={styles.emptySubtext}>Tap + to create one.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGroup')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  // BUG FIX: split into two separate styles so Image and View don't share
  // layout-only props (justifyContent / alignItems) that don't apply to Image
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 17, fontWeight: '700', color: '#111' },
  memberCount: { fontSize: 13, color: '#777', marginTop: 3 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#aaa', fontSize: 14, marginTop: 4 },
});