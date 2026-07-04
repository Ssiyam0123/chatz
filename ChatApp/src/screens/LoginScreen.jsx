import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing } from '../theme/blushDusk';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ navigation }) {
    const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          {/* Brand mark */}
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandName}>Chat-Z</Text>
          </View>

          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to continue with friends.</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.passContainer}>
              <TextInput
                style={styles.passInput}
                placeholder="Password"
                placeholderTextColor={colors.textSoft}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={loading}>
                <Ionicons name={showPass ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.8 }]} 
            onPress={async () => {
              if (!email || !password) {
                alert('Please enter both email and password');
                return;
              }
              try {
                setLoading(true);
                await login(email, password);
              } catch (err) {
                alert(err.response?.data?.error?.message || 'Login failed! Make sure the server is running and your credentials are correct.');
              } finally {
                setLoading(false);
              }
            }} 
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap} hitSlop={{ top: 10, bottom: 10 }} disabled={loading}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkHighlight}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.section,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.section,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.md,
    lineHeight: 20,
    outlineStyle: 'none',
  },
  passContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: spacing.lg,
  },
  passInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.md,
    lineHeight: 20,
    outlineStyle: 'none',
  },
  eyeBtn: { padding: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radii.small,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  linkWrap: { marginTop: spacing.xl, alignItems: 'center' },
  linkText: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  linkHighlight: { color: colors.primary, fontWeight: '600' },
});