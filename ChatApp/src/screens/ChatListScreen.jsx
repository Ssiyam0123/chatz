import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useChatStore from '../stores/chatStore';
import { colors, radii, spacing } from '../theme/blushDusk';
import EmptyState from '../components/ui/EmptyState';
import ListRow from '../components/ui/ListRow';
import Avatar from '../components/ui/Avatar';

export default function ChatListScreen({ navigation }) {
  const { conversations, fetchConversations, isLoadingUsers } = useChatStore();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const renderItem = ({ item }) => {
    const name = item.isGroup ? item.name : item.userDetails?.name || 'Unknown User';
    const avatarUrl = item.isGroup ? item.avatar : item.userDetails?.avatar;

    return (
      <ListRow
        avatar={
          <Avatar uri={avatarUrl} name={name} size="md" />
        }
        title={name}
        subtitle={item.lastMessage || 'No messages yet'}
        unread={item.unreadCount}
        badge={item.isGroup ? 'Group' : null}
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
        trailing={
          <Text style={styles.time}>
            {item.lastMessageTime
              ? new Date(item.lastMessageTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
        }
      />
    );
  };

  if (isLoadingUsers && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('GroupList')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('CreateGroup')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message="Find someone to start chatting with."
            actionLabel="Find friends"
            onAction={() => navigation.navigate('Friends')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  time: { fontSize: 12, color: colors.textSoft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
});