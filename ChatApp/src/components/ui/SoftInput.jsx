import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../../theme/blushDusk';

export default function SoftInput({ style, inputStyle, icon, ...props }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={colors.textSoft}
        {...props}
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    paddingVertical: spacing.md,
    outlineStyle: 'none',
  },
});
