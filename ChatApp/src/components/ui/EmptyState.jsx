import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/blushDusk';
import PrimaryButton from './PrimaryButton';

export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.container}>
      <View style={styles.iconTile}>
        <Ionicons name={icon || 'chatbubbles-outline'} size={36} color={colors.textSoft} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.section * 2,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: radii.medium,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  action: {
    minWidth: 160,
  },
});
