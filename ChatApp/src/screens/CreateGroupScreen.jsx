import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { getAllUsers, createGroup, uploadImage } from '../api/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/blushDusk';

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data.data);
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
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

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    const memberIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
    if (memberIds.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }
    try {
      setCreating(true);
      let avatarUrl = '';
      if (avatar) {
        avatarUrl = await uploadImage(avatar);
      }
      await createGroup(groupName, memberIds, avatarUrl);
      Alert.alert('Success', 'Group created successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create group');
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
        <Text style={styles.userName}>{item.name}</Text>
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
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
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
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            style={styles.userList}
            contentContainerStyle={styles.userListContent}
          />
        )}

        <TouchableOpacity 
          style={[styles.createButton, (creating || loading) && styles.disabledButton]} 
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
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
  userList: { flex: 1 },
  userListContent: { paddingBottom: 80 },
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
});
