import React from 'react';
import { SafeAreaView, View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme/blushDusk';
import { useTheme } from '../../theme/ThemeContext';

export default function Screen({ children, style, noHorizontalPadding, safeArea = true }) {
  const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
  const insets = useSafeAreaInsets();

  if (safeArea) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }, style]}>
        <View style={[noHorizontalPadding ? null : styles.padding, { flex: 1 }]}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[noHorizontalPadding ? null : styles.padding, { flex: 1 }]}>
        {children}
      </View>
    </View>
  );
}

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padding: {
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
});
