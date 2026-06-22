import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Modal } from 'react-native';
import { getAllUsers, createGroup, uploadImage, getFriends } from '../api/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';
import useChatStore from '../stores/chatStore';

export default function CreateGroupScreen({ navigation }) {
    const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [friendsRes, allUsersRes] = await Promise.all([
        getFriends(),
        getAllUsers(),
      ]);
      const friendsList = (friendsRes.data.data || []).map(u => ({ ...u, isFriend: true }));
      const allUsersList = allUsersRes.data.data || [];

      const friendIds = new Set(friendsList.map(f => f.id));
      const nonFriendsList = allUsersList.filter(u => !friendIds.has(u.id));

      setUsers([...friendsList, ...nonFriendsList]);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (userId) => {
    setSelectedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const pickAvatar = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          window.alert('Permission Denied: Sorry, we need camera roll permissions to make this work!');
        } else {
          Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        }
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0]);
    }
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showAlert('Error', 'Please enter a group name');
      return;
    }
    const memberIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
    if (memberIds.length === 0) {
      showAlert('Error', 'Please select at least one member');
      return;
    }
    try {
      setCreating(true);
      let avatarUrl = '';
      if (avatar) {
        avatarUrl = await uploadImage(avatar);
      }
      await createGroup(groupName, memberIds, avatarUrl);
      
      // Force refresh the global stores before going back
      useChatStore.getState().fetchGroups();
      useChatStore.getState().fetchConversations();
      
      setShowSuccessModal(true);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => toggleSelect(item.id)} activeOpacity={0.7}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, selectedUsers[item.id] && { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.avatarText, selectedUsers[item.id] && { color: colors.primary }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          {item.isFriend && <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '500' }}>Friend</Text>}
        </View>
      </View>
      <Ionicons
        name={selectedUsers[item.id] ? 'checkbox' : 'square-outline'}
        size={24}
        color={selectedUsers[item.id] ? colors.primary : colors.border}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'web' ? (
        <ScrollView 
          style={{ flex: 1, flexBasis: 0 }} 
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
              {avatar ? (
                <Image source={{ uri: avatar.uri }} style={styles.selectedAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={36} color={colors.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Group name"
              placeholderTextColor={colors.textSoft}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>

          <Text style={styles.sectionTitle}>Select Members</Text>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.userListContainer}>
              {users.map((item) => (
                <React.Fragment key={item.id}>
                  {renderUser({ item })}
                </React.Fragment>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.createButton, 
              (creating || loading) && styles.disabledButton,
              { position: 'fixed', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, zIndex: 1000 }
            ]} 
            onPress={handleCreate} 
            disabled={creating || loading}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
                {avatar ? (
                  <Image source={{ uri: avatar.uri }} style={styles.selectedAvatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={36} color={colors.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Group name"
                placeholderTextColor={colors.textSoft}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <Text style={styles.sectionTitle}>Select Members</Text>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.userListContainer}>
                {users.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderUser({ item })}
                  </React.Fragment>
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={[
                styles.createButton, 
                (creating || loading) && styles.disabledButton,
                Platform.OS === 'web' && { position: 'fixed', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, zIndex: 1000 }
              ]} 
              onPress={handleCreate} 
              disabled={creating || loading}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalMessage}>Group created successfully!</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    flexBasis: 0,
    backgroundColor: colors.background
  },
  container: { flex: 1, flexBasis: 0, padding: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xxl },
  avatarPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  selectedAvatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { alignItems: 'center' },
  inputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
    outlineStyle: 'none',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text,
  },
  userListContainer: { 
    marginBottom: spacing.md, 
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.small,
    marginBottom: spacing.xs,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontWeight: '700', color: colors.textMuted },
  userName: { fontSize: 15, color: colors.text },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radii.small,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.5 },
  createButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.large,
    padding: spacing.xxl,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalIconBox: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: radii.small,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
