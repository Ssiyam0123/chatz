import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii, typography } from '../../theme/blushDusk';
import { useTheme } from '../../theme/ThemeContext';

export default function SoftHeader({ title, onBack, trailing, style }) {
  const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {trailing || null}
      </View>
    </View>
  );
}

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
