import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { api } from "../api/api";
import { useHeaderHeight } from "@react-navigation/elements";

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const headerHeight = useHeaderHeight();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [email] = useState(user?.email || ""); 
  const [image, setImage] = useState(user?.avatar || null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!name) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);

      if (image && image !== user?.avatar) {
        const uriParts = image.split(".");
        const fileType = uriParts[uriParts.length - 1];
        formData.append("avatar", {
          uri: image,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      const response = await api.put("/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        updateUser(response.data.data.user);
        Alert.alert("Success", "Profile updated successfully!");
      }
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error.response?.data?.message || "Something went wrong",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              {image ? (
                <Image source={{ uri: image }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>
                    {name[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email Address (Cannot be changed)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: "#f0f0f0", color: "#888" },
                ]}
                value={email}
                editable={false} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.updateButton, uploading && styles.disabledButton]}
              onPress={handleUpdate}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Update Profile</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  imageSection: { alignItems: "center", marginVertical: 30 },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: "relative",
  },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  cameraIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  changePhotoText: { marginTop: 10, color: "#007bff", fontWeight: "600" },
  form: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: "#666", marginBottom: 8, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  bioInput: { height: 100, textAlignVertical: "top" },
  updateButton: {
    backgroundColor: "#007bff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  updateButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#b0d4ff" },
  logoutButton: { marginTop: 20, padding: 10, alignItems: "center" },
  logoutText: { color: "#ff4d4d", fontWeight: "bold" },
});
