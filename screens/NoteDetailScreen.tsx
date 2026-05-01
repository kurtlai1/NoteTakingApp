import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenContainer from '../components/ScreenContainer';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import {
  deleteNote,
  getNoteById,
  setNoteFavorite,
  getTagsSummary,
  TagColorKey,
  TAG_COLOR_OPTIONS,
} from '../database/database';

type Props = NativeStackScreenProps<HomeStackParamList, 'NoteDetail'>;

type NoteRecord = {
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function NoteDetailScreen({ route, navigation }: Props) {
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [note, setNote] = useState<NoteRecord | null>(null);
  const [tagsSummary, setTagsSummary] = useState<
    Array<{
      tag: string;
      count: number;
      latest: string;
      colorKey: TagColorKey | null;
    }>
  >([]);

  const noteId = route.params?.noteId;

  useFocusEffect(
    useCallback(() => {
      if (!noteId) {
        navigation.replace('NoteEditor', {});
      }
    }, [noteId, navigation]),
  );

  const loadNote = useCallback(async () => {
    if (!noteId) {
      setNote(null);
      return;
    }

    const found = await getNoteById(noteId);
    setNote((found as NoteRecord | null) ?? null);
  }, [noteId]);

  const loadTagsSummary = useCallback(async () => {
    try {
      const result = await getTagsSummary();
      setTagsSummary(result);
    } catch {
      setTagsSummary([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNote();
      loadTagsSummary();
    }, [loadNote, loadTagsSummary]),
  );

  const handleDelete = async () => {
    if (!noteId) {
      setIsDeleteDialogVisible(false);
      return;
    }

    await deleteNote(noteId);
    setIsDeleteDialogVisible(false);
    navigation.navigate({ name: 'HomeMain', params: {} });
  };

  const handleToggleFavorite = async () => {
    if (!noteId || !note) {
      return;
    }

    const updated = await setNoteFavorite(noteId, note.is_favorite !== 1);
    setNote((updated as NoteRecord | null) ?? note);
  };

  const handleOpenEditor = () => {
    navigation.replace('NoteEditor', noteId ? { noteId } : {});
  };

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsSummary.forEach(summary => {
      if (summary.colorKey) {
        map[summary.tag] = summary.colorKey;
      }
    });
    return map;
  }, [tagsSummary]);

  const getTagColor = (tag: string): string => {
    const colorKey = tagColorMap[tag];
    if (!colorKey) return '#f1f5f9';
    const colorOption = TAG_COLOR_OPTIONS.find(opt => opt.key === colorKey);
    return colorOption ? colorOption.color : '#f1f5f9';
  };

  const [showMenu, setShowMenu] = useState(false);

  const tags = parseTags(note?.tags ?? '');

  // Set header options with star and three-dots
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          {/* Star favorite */}
          <Pressable onPress={handleToggleFavorite} style={{ padding: 8 }}>
            <MaterialCommunityIcons
              name={note?.is_favorite === 1 ? 'star' : 'star-outline'}
              size={24}
              color={note?.is_favorite === 1 ? '#fbbf24' : '#cbd5e1'}
            />
          </Pressable>

          <Pressable onPress={handleOpenEditor} style={{ padding: 8 }}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={24}
              color="#2563eb"
            />
          </Pressable>

          {/* Three-dots menu button */}
          <Pressable
            onPress={() => setShowMenu(!showMenu)}
            style={{ padding: 8 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={24}
              color="#334155"
            />
          </Pressable>
        </View>
      ),
    });
  }, [note?.is_favorite, showMenu, navigation, handleToggleFavorite]);

  return (
    <ScreenContainer scrollable>
      {/* Overflow menu - rendered at screen level to avoid header clipping */}
      {showMenu && (
        <>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.screenOverflowMenu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setIsDeleteDialogVisible(true);
              }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color="#ef4444"
              />
              <Text style={styles.menuItemText}>Delete</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.heroCard}>
        <View style={styles.heroStack}>
          <Text style={styles.title}>{note?.title ?? 'Untitled note'}</Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.updatedAt}>
              {note?.updated_at
                ? `Updated ${formatDate(note.updated_at)}`
                : 'No saved content yet'}
            </Text>

            <View style={styles.metaDivider} />

            <Text style={styles.characterCount}>
              {note?.body?.length ?? 0} characters
            </Text>
          </View>
        </View>
      </View>

      {tags.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Tags: {tags.length}</Text>
          <View style={styles.tagsRow}>
            {tags.map(tag => (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: getTagColor(tag) }]}
              >
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Body</Text>
        <View style={styles.divider} />
        <Text style={styles.bodyText}>
          {note?.body ??
            'This note has no content yet. Tap Edit to create your note.'}
        </Text>
      </View>

      <ConfirmDialog
        visible={isDeleteDialogVisible}
        title="Move To Recycle Bin"
        message="This note will move to Recycle Bin. Permanently delete it from Recycle Bin when needed."
        confirmText="Move"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  activeSecondaryActionButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  activeSecondaryActionButtonText: {
    color: '#92400e',
  },
  bodyText: {
    color: '#1e293b',
    fontSize: 15,
    lineHeight: 24,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  cancelAction: {
    backgroundColor: '#e2e8f0',
  },
  cancelActionText: {
    color: '#0f172a',
  },
  ghostActionButton: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ef',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  secondaryActionButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  secondaryActionButtonText: {
    color: '#334155',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  heroStatusStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  heroMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  heroStack: {
    flexDirection: 'column',
  },
  metaDivider: {
    backgroundColor: '#cbd5e1',
    height: 14,
    width: 1,
  },
  kicker: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  screenOverflowMenu: {
    position: 'absolute',
    top: 0,
    right: 40,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    minWidth: 140,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  tagChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  updatedAt: {
    color: '#64748b',
    fontSize: 13,
  },
  characterCount: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillMuted: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillMutedText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
});
