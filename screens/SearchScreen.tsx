import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NoteCard from '../components/NoteCard';
import ScreenContainer from '../components/ScreenContainer';
import { getAllNotes } from '../database/database';

type NoteRow = {
  id: number;
  title: string;
  body: string;
  tags: string;
  is_favorite: number;
  deleted_at: string | null;
  updated_at: string;
};

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<NoteRow[]>([]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return notes;
    }

    return notes.filter(note => {
      const tags = parseTags(note.tags);
      return (
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        tags.some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [query]);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="magnify" size={26} color="#0f766e" />
        <Text style={styles.title}>Search</Text>
      </View>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color="#475569" />
        <TextInput
          placeholder="Search title, body, or folders"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <NoteCard
            id={item.id}
            title={item.title}
            body={item.body}
            tags={parseTags(item.tags)}
            updated_at={item.updated_at}
            isFavorite={item.is_favorite === 1}
            onPress={() => navigation.navigate('Home', { screen: 'NoteDetail', params: { noteId: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="note-search-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No notes found.</Text>
          </View>
        }
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
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#eef2f7',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    color: '#0f172a',
    flex: 1,
    paddingVertical: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
});
