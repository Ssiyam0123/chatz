import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/blushDusk';
import Avatar from './Avatar';

const ListRow = React.memo(({
  avatar,
  avatarName,
  title,
  subtitle,
  trailing,
  onPress,
  unread,
  badge,
  style,
}) => {
  const Content = (
    <View style={[styles.row, style]}>
      {avatar !== undefined ? (
        avatar
      ) : avatarName ? (
        <Avatar uri={null} name={avatarName} size="md" />
      ) : null}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          <Text style={[styles.title, unread && styles.unreadTitle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, unread && styles.unreadSubtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : null}
      {unread ? (
        <View style={styles.unreadDot}>
          <Text style={styles.unreadDotText}>{unread}</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Content}</TouchableOpacity>;
  }
  return Content;
});


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadSubtitle: {
    fontWeight: '600',
    color: colors.text,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  unreadDotText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ListRow;
