import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Sample data for different IDs
const itemDetails = {
  '1': { type: 'chat', name: 'Family Group', participants: ['Mom', 'Dad', 'Sister'], messages: 234, created: 'Jan 2023' },
  '2': { type: 'chat', name: 'Work Team', participants: ['John', 'Sarah', 'Mike'], messages: 567, created: 'Mar 2023' },
  '3': { type: 'chat', name: 'Friends', participants: ['Alex', 'Emma', 'Chris'], messages: 123, created: 'Jun 2023' },
  '4': { type: 'chat', name: 'Project Alpha', participants: ['David', 'Lisa'], messages: 89, created: 'Aug 2023' },
  '5': { type: 'group', name: 'Tech Enthusiasts', members: 15, category: 'Technology', created: 'Jan 2023' },
  '6': { type: 'group', name: 'Travel Buddies', members: 23, category: 'Travel', created: 'Feb 2023' },
  '7': { type: 'group', name: 'Book Club', members: 12, category: 'Books', created: 'Mar 2023' },
  '8': { type: 'group', name: 'Fitness Freaks', members: 18, category: 'Health', created: 'Apr 2023' },
};

export default function ItemDetails() {
  const { id } = useLocalSearchParams();
  const item = itemDetails[id] || { type: 'unknown', name: 'Unknown Item' };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: item.name,
          headerRight: () => (
            <TouchableOpacity onPress={() => console.log('More options')}>
              <Ionicons name="ellipsis-vertical" size={24} color="#f4511e" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>{item.name}</Text>
          
          {item.type === 'chat' ? (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{item.participants?.length || 0}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{item.messages || 0}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{item.members || 0}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="pricetag" size={24} color="#f4511e" />
                <Text style={styles.statValue}>{item.category || 'N/A'}</Text>
                <Text style={styles.statLabel}>Category</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{item.type === 'chat' ? 'Chat Group' : 'Community Group'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{item.created || 'N/A'}</Text>
          </View>
        </View>

        {item.type === 'chat' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {item.participants?.map((participant, index) => (
              <View key={index} style={styles.participantItem}>
                <Ionicons name="person-circle" size={32} color="#999" />
                <Text style={styles.participantName}>{participant}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#f8f8f8',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4511e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: '500',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantName: {
    fontSize: 16,
    marginLeft: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4511e',
    padding: 16,
    margin: 16,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});