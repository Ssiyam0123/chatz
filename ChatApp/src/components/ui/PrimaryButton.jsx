import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radii } from '../../theme/blushDusk';

export default function PrimaryButton({ title, onPress, loading, disabled, style, textStyle, outline, secondary }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const bgColor = outline ? 'transparent'
    : secondary ? colors.secondary
    : colors.primary;
  const txtColor = outline ? colors.primary
    : colors.white;
  const borderColor = outline ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgColor, borderColor },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: txtColor }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors) => StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
