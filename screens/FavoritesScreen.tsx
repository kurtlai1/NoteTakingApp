import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NoteCard from '../components/NoteCard';
import ScreenContainer from '../components/ScreenContainer';
import { getFavoriteNotes } from '../database/database';

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

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<NoteRow[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const result = await getFavoriteNotes();
      setNotes(result as NoteRow[]);
    } catch {
      setNotes([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="star-outline" size={26} color="#d97706" />
        <Text style={styles.title}>Favorites</Text>
      </View>
      <Text style={styles.subtitle}>Your starred notes.</Text>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={notes}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <NoteCard
            id={item.id}
            title={item.title}
            body={item.body}
            tags={parseTags(item.tags)}
            updated_at={item.updated_at}
            isFavorite={item.is_favorite === 1}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'NoteDetail', params: { noteId: item.id } } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="star-off-outline" size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No favorite notes yet.</Text>
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
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
});
