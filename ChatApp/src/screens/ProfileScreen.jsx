import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.bigAvatar}><Text style={styles.avatarText}>{user?.name?.[0]}</Text></View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, alignItems: 'center' },
  profileCard: { backgroundColor: '#fff', width: '100%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 2 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold' },
  userEmail: { color: '#666', marginTop: 5 },
  logoutBtn: { marginTop: 30, backgroundColor: '#ff4d4d', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  logoutText: { color: '#fff', fontWeight: 'bold' }
});