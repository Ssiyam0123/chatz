import React from 'react';
import { SafeAreaView, View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/blushDusk';

export default function Screen({ children, style, noHorizontalPadding, safeArea = true }) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padding: {
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
});
