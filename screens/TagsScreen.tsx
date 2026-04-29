import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenContainer from '../components/ScreenContainer';
import NoteCard from '../components/NoteCard';
import { getAllNotes } from '../database/database';

type NoteRow = {
  id: number;
  title: string;
  body: string;
  tags: string;
  updated_at: string;
};

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export default function TagsScreen() {
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  const loadNotes = useCallback(async () => {
    try {
      const result = await getAllNotes();
      setNotes(result as NoteRow[]);
    } catch {
      setNotes([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const tags = useMemo(() => {
    const allTags = notes.flatMap(note => parseTags(note.tags));
    return Array.from(new Set(allTags)).sort((left, right) => left.localeCompare(right));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!selectedTag) {
      return notes;
    }

    return notes.filter(note => parseTags(note.tags).includes(selectedTag));
  }, [notes, selectedTag]);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="tag-multiple-outline" size={26} color="#0f766e" />
        <Text style={styles.title}>Tags</Text>
      </View>
      <Text style={styles.subtitle}>Browse notes by tag categories.</Text>

      <View style={styles.tagsWrap}>
        {tags.map(tag => (
          <Pressable
            key={tag}
            style={[styles.tagChip, selectedTag === tag && styles.tagChipSelected]}
            onPress={() => setSelectedTag(prev => (prev === tag ? '' : tag))}
          >
            <Text style={[styles.tagText, selectedTag === tag && styles.tagTextSelected]}>
              #{tag}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredNotes}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="tag-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No notes found for this tag.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NoteCard
            id={item.id}
            title={item.title}
            body={item.body}
            tags={parseTags(item.tags)}
            updated_at={item.updated_at}
            onPress={() => navigation.navigate('Home', { screen: 'NoteDetail', params: { noteId: item.id } })}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 10,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#eef6ff',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipSelected: {
    backgroundColor: '#1d4ed8',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
});
