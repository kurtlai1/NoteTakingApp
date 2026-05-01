import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenContainer from '../components/ScreenContainer';
import {
  getDeletedNotes,
  permanentlyDeleteNote,
  restoreNote,
} from '../database/database';

type NoteRow = {
  id: number;
  title: string;
  body: string;
  tags: string;
  is_favorite: number;
  deleted_at: string | null;
  updated_at: string;
};

function formatDeletedAt(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

import { useNavigation } from '@react-navigation/native';

export default function RecycleBinScreen() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const navigation = useNavigation<any>();

  const loadDeletedNotes = useCallback(async () => {
    try {
      const result = await getDeletedNotes();
      setNotes(result as NoteRow[]);
    } catch {
      setNotes([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDeletedNotes();
    }, [loadDeletedNotes]),
  );

  const handlePermanentDelete = (noteId: number) => {
    Alert.alert(
      'Delete Permanently',
      'This action will permanently remove the note from database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await permanentlyDeleteNote(noteId);
            loadDeletedNotes();
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ padding: 6, marginRight: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={26} color="#111827" />
        </Pressable>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={26}
            color="#dc2626"
          />
          <Text style={styles.title}>Recycle Bin</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Notes moved here are not deleted permanently yet.
      </Text>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={notes}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.deletedAt}>
              Deleted: {formatDeletedAt(item.deleted_at)}
            </Text>

            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={async () => {
                  await restoreNote(item.id);
                  loadDeletedNotes();
                }}
                style={styles.restoreButton}
              >
                <Text style={styles.restoreButtonText}>Restore</Text>
              </Pressable>

              <Pressable
                onPress={() => handlePermanentDelete(item.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete Forever</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="delete-empty-outline"
              size={32}
              color="#94a3b8"
            />
            <Text style={styles.emptyText}>Recycle bin is empty.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  restoreButton: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  restoreButtonText: {
    color: '#065f46',
    fontWeight: '700',
  },
  cardBody: {
    color: '#475569',
    marginTop: 6,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  deletedAt: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
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
    marginLeft: 0,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
});
