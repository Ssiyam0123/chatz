import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import useChatStore from '../stores/chatStore';

export default function ChatListScreen({ navigation }) {
  const { conversations, fetchConversations, isLoadingUsers } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  const renderItem = ({ item }) => {
    // Handle both private (userDetails) and group (name/avatar) conversations
    const name = item.isGroup ? item.name : item.userDetails?.name || 'Unknown User';
    const avatarUrl = item.isGroup ? item.avatar : item.userDetails?.avatar;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          if (item.isGroup) {
            navigation.navigate('GroupChat', {
              groupId: item._id,
              groupName: name,
            });
          } else {
            navigation.navigate('ChatDetail', {
              userId: item._id,
              userName: name,
            });
          }
        }}
      >
        {/* Avatar with image support */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.isGroup && <Text style={styles.groupBadge}>Group</Text>}
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
            </View>
            <Text style={styles.time}>
              {item.lastMessageTime
                ? new Date(item.lastMessageTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingUsers && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('People')}>
              <Text style={styles.startText}>Find someone to chat with</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#ddd',
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, marginLeft: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
  name: { fontSize: 17, fontWeight: 'bold', color: '#000', maxWidth: 180 },
  groupBadge: {
    backgroundColor: '#e7f3ff',
    color: '#007bff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 5,
    overflow: 'hidden',
  },
  time: { fontSize: 12, color: '#999' },
  lastMsg: { fontSize: 14, color: '#666', maxWidth: '90%' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', fontSize: 16 },
  startText: { color: '#007bff', marginTop: 10, fontWeight: '600' },
});