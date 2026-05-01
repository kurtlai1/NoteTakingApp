import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { TAG_COLOR_OPTIONS } from '../database/database';

export type NoteCardProps = {
  id: string | number;
  title: string;
  body: string;
  tags: string[];
  updated_at: string | number | Date;
  isFavorite?: boolean;
  tagColors?: Record<string, string>;
  onPress: (id: string | number) => void;
};

function formatUpdatedAt(value: NoteCardProps['updated_at']): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function NoteCard({
  id,
  title,
  body,
  tags,
  updated_at,
  isFavorite = false,
  tagColors = {},
  onPress,
}: NoteCardProps) {
  const getTagColor = (tag: string): string => {
    const colorKey = tagColors[tag];
    if (!colorKey) return '#eef6ff';
    const colorOption = TAG_COLOR_OPTIONS.find(opt => opt.key === colorKey);
    return colorOption ? colorOption.color : '#eef6ff';
  };

  return (
    <Pressable onPress={() => onPress(id)} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          {isFavorite ? (
            <MaterialCommunityIcons
              name="star"
              size={16}
              color="#f59e0b"
              style={styles.favoriteIcon}
            />
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={styles.updatedAt}>{formatUpdatedAt(updated_at)}</Text>
      </View>

      <Text style={styles.bodyPreview} numberOfLines={2} ellipsizeMode="tail">
        {body}
      </Text>

      <View style={styles.tagsRow}>
        {tags.map(tag => (
          <View
            key={`${id}-${tag}`}
            style={[styles.tagChip, { backgroundColor: getTagColor(tag) }]}
          >
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bodyPreview: {
    color: '#455a64',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ebf3',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  favoriteIcon: {
    marginRight: 4,
  },
  tagChip: {
    backgroundColor: '#eef6ff',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
  },
  tagText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#1f2937',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  updatedAt: {
    color: '#6b7280',
    fontSize: 12,
  },
});
