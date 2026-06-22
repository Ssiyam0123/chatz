import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radii, typography, shadows } from '../theme/blushDusk';
import Avatar from '../components/ui/Avatar';
import ReportModal from '../components/ui/ReportModal';
import { getGroupById, updateGroup, addGroupMembers, removeGroupMembers, leaveGroup, getFriends, uploadImage } from '../api/api';
import useChatStore from '../stores/chatStore';

export default function GroupDetailsScreen({ route, navigation }) {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Add Members modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  const [reportModalVisible, setReportModalVisible] = useState(false);

  const user = useChatStore((state) => state.user);
  const currentUserId = user?.id || user?._id;

  const isCreator = group?.creatorId === currentUserId;

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGroupById(groupId);
      setGroup(res.data.data);
      setTempName(res.data.data.name);
    } catch (err) {
      console.error('Failed to get group details:', err);
      Alert.alert('Error', 'Failed to fetch group details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleUpdateName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Validation Error', 'Group name cannot be empty.');
      return;
    }
    try {
      setUpdating(true);
      const res = await updateGroup(groupId, tempName.trim(), null);
      setGroup(res.data.data);
      setEditingName(false);
      Alert.alert('Success', 'Group name updated successfully.');
    } catch (err) {
      console.error(err);
      Alert.alert('Update Failed', err.response?.data?.message || err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!isCreator) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      try {
        setUpdating(true);
        const uploadedUrl = await uploadImage(result.assets[0]);
        const res = await updateGroup(groupId, null, uploadedUrl);
        setGroup(res.data.data);
        Alert.alert('Success', 'Group avatar updated successfully.');
      } catch (err) {
        console.error(err);
        Alert.alert('Upload Failed', err.message);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleOpenAddModal = async () => {
    setAddModalVisible(true);
    try {
      setFriendsLoading(true);
      const res = await getFriends();
      // Filter out friends already in the group
      const existingMemberIds = group.members.map(m => m.id || m._id);
      const filtered = res.data.data.filter(f => !existingMemberIds.includes(f.id || f._id));
      setFriends(filtered);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch friends.');
    } finally {
      setFriendsLoading(false);
    }
  };

  const toggleSelectFriend = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const handleAddSelectedMembers = async () => {
    if (selectedFriends.length === 0) return;
    try {
      setUpdating(true);
      const res = await addGroupMembers(groupId, selectedFriends);
      setGroup(res.data.data);
      setAddModalVisible(false);
      setSelectedFriends([]);
      Alert.alert('Success', 'Members added successfully.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const res = await removeGroupMembers(groupId, [memberId]);
              setGroup(res.data.data);
              Alert.alert('Success', `${memberName} removed successfully.`);
            } catch (err) {
              console.error(err);
              Alert.alert('Error', err.response?.data?.message || err.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await leaveGroup(groupId);
              Alert.alert('Success', 'You have left the group.');
              navigation.navigate('GroupList');
            } catch (err) {
              console.error(err);
              Alert.alert('Error', err.response?.data?.message || err.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Group Header Info */}
        <View style={styles.headerCard}>
          <TouchableOpacity onPress={handleUpdateAvatar} disabled={!isCreator || updating} activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              <Avatar uri={group?.avatar} name={group?.name} size="xl" />
              {isCreator && (
                <View style={styles.editAvatarBadge}>
                  <Ionicons name="camera" size={16} color={colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Group Name"
                placeholderTextColor={colors.textSoft}
                maxLength={40}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateName} disabled={updating}>
                <Ionicons name="checkmark" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingName(false); setTempName(group.name); }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.groupName}>{group?.name}</Text>
              {isCreator && (
                <TouchableOpacity onPress={() => setEditingName(true)} style={styles.editNameBtn}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.groupMeta}>
            Created by {group?.creator?.name} • {group?.members?.length ?? 0} members
          </Text>
        </View>

        {/* Members List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          {isCreator && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.addBtnText}>Add Member</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.membersCard}>
          {group?.members?.map((member) => {
            const memberId = member.id || member._id;
            const isMemberCreator = memberId === group.creatorId;
            const isMe = memberId === currentUserId;

            return (
              <View key={memberId} style={styles.memberRow}>
                <Avatar uri={member.avatar} name={member.name} size="sm" />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name} {isMe && '(You)'}</Text>
                  {isMemberCreator && <Text style={styles.roleText}>Creator</Text>}
                </View>

                {isCreator && !isMemberCreator && !isMe && (
                  <TouchableOpacity
                    style={styles.removeIconBtn}
                    onPress={() => handleRemoveMember(memberId, member.name)}
                    disabled={updating}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Leave Group Button */}
        {/* Report Group */}
        <TouchableOpacity
          style={styles.reportGroupBtn}
          onPress={() => setReportModalVisible(true)}
        >
          <Ionicons name="flag-outline" size={20} color={colors.danger} />
          <Text style={styles.reportGroupBtnText}>Report Group</Text>
        </TouchableOpacity>

        {!isCreator && (
          <TouchableOpacity style={styles.leaveBtnContainer} onPress={handleLeaveGroup} disabled={updating}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.leaveBtnText}>Leave Group</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add Members Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Members</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setSelectedFriends([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {friendsLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.modalCenter}>
                <Text style={styles.emptyText}>All your friends are already members of this group.</Text>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id || item._id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const friendId = item.id || item._id;
                  const isSelected = selectedFriends.includes(friendId);
                  return (
                    <TouchableOpacity
                      style={styles.friendRow}
                      onPress={() => toggleSelectFriend(friendId)}
                      activeOpacity={0.7}
                    >
                      <Avatar uri={item.avatar} name={item.name} size="sm" />
                      <Text style={styles.friendName}>{item.name}</Text>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {friends.length > 0 && (
              <TouchableOpacity
                style={[styles.confirmAddBtn, selectedFriends.length === 0 && styles.confirmAddBtnDisabled]}
                onPress={handleAddSelectedMembers}
                disabled={selectedFriends.length === 0 || updating}
              >
                <Text style={styles.confirmAddBtnText}>Add Selected ({selectedFriends.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetType="group"
        targetId={groupId}
        targetName={group?.name || groupName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  editNameBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.xs,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    outlineStyle: 'none',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cancelBtn: {
    backgroundColor: colors.backgroundAlt,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  groupMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  membersCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  memberInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  roleText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  removeIconBtn: {
    padding: spacing.sm,
  },
  reportGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.medium,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  reportGroupBtnText: {
    fontSize: 15,
    color: colors.danger,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  leaveBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.medium,
    paddingVertical: spacing.md,
    marginBottom: spacing.xxl,
  },
  leaveBtnText: {
    fontSize: 15,
    color: colors.danger,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalCenter: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  confirmAddBtnDisabled: {
    opacity: 0.5,
  },
  confirmAddBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
