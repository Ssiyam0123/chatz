import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Sample groups data
const groups = [
  { id: '5', name: 'Tech Enthusiasts', members: 15, description: 'Discuss latest tech trends' },
  { id: '6', name: 'Travel Buddies', members: 23, description: 'Plan trips together' },
  { id: '7', name: 'Book Club', members: 12, description: 'Monthly book discussions' },
  { id: '8', name: 'Fitness Freaks', members: 18, description: 'Stay healthy together' },
];

export default function GroupProfile() {
  const navigateToGroupDetails = (groupId) => {
    // Navigate to the dynamic [id] route
    router.push(`/(app)/${groupId}`);
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => navigateToGroupDetails(item.id)}
    >
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.members}>{item.members} members</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  members: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#999',
  },
});