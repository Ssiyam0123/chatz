import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';

const SIZES = {
  sm: 32,
  md: 44,
  lg: 56,
  xl: 80,
  xxl: 110,
};

const Avatar = React.memo(({ uri, name, size = 'md', status, style }) => {
  const { colors } = useTheme();
  styles = getStyles(colors);
  const dimension = SIZES[size] || SIZES.md;
  const borderRadius = dimension / 2;

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: dimension, height: dimension, borderRadius }]}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius }]}>
          <Text style={[styles.initial, { fontSize: dimension * 0.4 }]}>
            {name ? name[0].toUpperCase() : '?'}
          </Text>
        </View>
      )}
      {status === 'online' && (
        <View style={[styles.statusDot, { width: dimension * 0.22, height: dimension * 0.22, borderRadius: dimension * 0.11 }]} />
      )}
    </View>
  );
});

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    backgroundColor: colors.surfaceMuted,
  },
  placeholder: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
});

export default Avatar;
