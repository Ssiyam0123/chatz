import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { spacing, radii } from '../../theme/blushDusk';
import { useTheme } from '../../theme/ThemeContext';

export default function SoftInput({ style, inputStyle, icon, ...props }) {
  const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
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

let styles;
let colors;
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
