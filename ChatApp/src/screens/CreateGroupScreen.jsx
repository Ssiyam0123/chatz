import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { getAllUsers, createGroup, uploadImage } from '../api/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

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
    <TouchableOpacity style={styles.userItem} onPress={() => toggleSelect(item._id)}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{item.name}</Text>
      </View>
      <Ionicons 
        name={selectedUsers[item._id] ? 'checkbox' : 'square-outline'} 
        size={24} 
        color={selectedUsers[item._id] ? '#007AFF' : '#ccc'} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.selectedAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera" size={40} color="#999" />
              <Text style={styles.avatarPlaceholderText}>Add Avatar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Group name"
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>
      <Text style={styles.sectionTitle}>Select Members</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          style={styles.userList}
        />
      )}
      <TouchableOpacity 
        style={[styles.createButton, (creating || loading) && styles.disabledButton]} 
        onPress={handleCreate} 
        disabled={creating || loading}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  inputContainer: { marginBottom: 20 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16 
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  userList: { flex: 1 },
  userItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderColor: '#f0f0f0' 
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#eee', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: { fontWeight: 'bold', color: '#555' },
  userName: { fontSize: 16 },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  disabledButton: { backgroundColor: '#ccc' },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedAvatar: { width: 100, height: 100 },
  avatarPlaceholder: { alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 12, color: '#999', marginTop: 4 },
});
