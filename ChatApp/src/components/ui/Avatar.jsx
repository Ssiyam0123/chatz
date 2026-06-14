import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme/blushDusk';

const SIZES = {
  sm: 32,
  md: 44,
  lg: 56,
  xl: 80,
  xxl: 110,
};

export default function Avatar({ uri, name, size = 'md', status, style }) {
  const dimension = SIZES[size] || SIZES.md;
  const borderRadius = dimension / 2;

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }, style]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: dimension, height: dimension, borderRadius }]} />
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
}

const styles = StyleSheet.create({
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
