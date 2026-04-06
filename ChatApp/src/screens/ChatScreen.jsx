import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { sendMessage as emitSocketMessage } from '../utils/socket';

export default function ChatScreen({ route }) {
  const { userId: partnerId, userName } = route.params;
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  
  const headerHeight = useHeaderHeight();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { messages, isLoadingMessages, setActiveChat } = useChatStore();

  useEffect(() => {
    setActiveChat(partnerId);
    return () => setActiveChat(null);
  }, [partnerId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    emitSocketMessage(partnerId, inputText.trim());
    setInputText('');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === currentUserId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
            {formatTime(item.createdAt || new Date())}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.inner}>
          {isLoadingMessages ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color="#007bff" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item._id || index.toString()}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Say hi to {userName}!</Text>
                </View>
              )}
            />
          )}

          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline={true}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !inputText.trim() && styles.disabledButton]} 
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  inner: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 10 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { 
    maxWidth: '80%', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  myBubble: { backgroundColor: '#007bff', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#f1f1f1', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#222' },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  theirTime: { color: '#999' },
  inputWrapper: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
    paddingTop: 5,
    paddingBottom: 5,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 2,
  },
  disabledButton: { backgroundColor: '#b0d4ff' },
  sendText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#aaa', fontStyle: 'italic' }
});