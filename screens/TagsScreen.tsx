import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenContainer from '../components/ScreenContainer';
import NoteCard from '../components/NoteCard';
import {
  getAllNotes,
  getTagsSummary,
  TagColorKey,
  setTagColor,
  clearTagColor,
  renameTag,
  deleteTag,
  TAG_COLOR_OPTIONS,
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

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export default function TagsScreen() {
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [manageTargetTag, setManageTargetTag] = useState('');
  const [manageInputValue, setManageInputValue] = useState('');
  const [tagsSummary, setTagsSummary] = useState<
    Array<{
      tag: string;
      count: number;
      latest: string;
      colorKey: TagColorKey | null;
    }>
  >([]);

  const loadNotes = useCallback(async () => {
    try {
      const result = await getAllNotes();
      setNotes(result as NoteRow[]);
    } catch {
      setNotes([]);
    }
  }, []);

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
      loadNotes();
      loadTagsSummary();
    }, [loadNotes, loadTagsSummary]),
  );

  const tags = useMemo(() => {
    if (tagsSummary.length > 0) return tagsSummary.map(t => t.tag);
    const allTags = notes.flatMap(n => parseTags(n.tags));
    return Array.from(new Set(allTags));
  }, [notes, tagsSummary]);

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsSummary.forEach(summary => {
      if (summary.colorKey) {
        map[summary.tag] = summary.colorKey;
      }
    });
    return map;
  }, [tagsSummary]);

  const filteredNotes = useMemo(() => {
    if (selectedTags.length === 0) return notes;
    return notes.filter(note =>
      selectedTags.some(tag => parseTags(note.tags).includes(tag)),
    );
  }, [notes, selectedTags]);

  const toggleSelectTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const openManageModal = (tag: string) => {
    setManageTargetTag(tag);
    setManageInputValue(tag);
    setManageModalVisible(true);
  };

  const applyTagColor = async (colorKey: TagColorKey) => {
    try {
      await setTagColor(manageTargetTag, colorKey);
      await loadTagsSummary();
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to set tag color');
    }
  };

  const applyDefaultTagColor = async () => {
    try {
      await clearTagColor(manageTargetTag);
      await loadTagsSummary();
    } catch (err) {
      Alert.alert(
        'Error',
        (err as Error).message || 'Failed to set default tag color',
      );
    }
  };

  const performRename = async () => {
    try {
      await renameTag(manageTargetTag, manageInputValue);
      await loadNotes();
      await loadTagsSummary();
      setManageModalVisible(false);
      setManageTargetTag('');
      setManageInputValue('');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to rename tag');
    }
  };

  const confirmDeleteTag = () => {
    Alert.alert(
      'Delete tag',
      `Delete "${manageTargetTag}" from all notes? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTag(manageTargetTag);
              await loadNotes();
              await loadTagsSummary();
              setManageModalVisible(false);
              setManageTargetTag('');
              setManageInputValue('');
            } catch (err) {
              Alert.alert(
                'Error',
                (err as Error).message || 'Failed to delete tag',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.headerTopRow}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="tag-multiple-outline"
            size={26}
            color="#0f766e"
          />
          <Text style={styles.title}>Tags</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Browse notes by tag categories.</Text>
      <Text style={styles.subtitle}>Long press a tag to manage it.</Text>

      <View style={styles.tagsWrap}>
        {tags.map(tag => {
          const summary = tagsSummary.find(t => t.tag === tag);
          const count = summary
            ? summary.count
            : notes.filter(n => parseTags(n.tags).includes(tag)).length;
          const selected = selectedTags.includes(tag);
          const colorKey = summary?.colorKey;
          const chipColor = colorKey
            ? getColorByKey(colorKey)
            : stringToColor(tag);

          return (
            <Pressable
              key={tag}
              style={[
                styles.tagChip,
                selected && styles.tagChipSelected,
                { backgroundColor: chipColor },
              ]}
              onPress={() => toggleSelectTag(tag)}
              onLongPress={() => openManageModal(tag)}
            >
              <Text style={styles.tagText}>{tag}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredNotes}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="folder-outline"
              size={32}
              color="#94a3b8"
            />
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
            isFavorite={item.is_favorite === 1}
            tagColors={tagColorMap}
            onPress={() =>
              navigation.navigate('Home', {
                screen: 'NoteDetail',
                params: { noteId: item.id },
              })
            }
          />
        )}
      />

      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.manageOverlay}>
          <View style={styles.manageDialog}>
            <Text style={styles.manageTitle}>Manage tag</Text>
            <Text style={styles.manageLabel}>Tag: {manageTargetTag}</Text>

            <TextInput
              style={styles.manageInput}
              value={manageInputValue}
              onChangeText={setManageInputValue}
              placeholder="Enter new tag name"
            />

            <Text style={styles.colorSectionLabel}>Color</Text>
            <View style={styles.colorSwatches}>
              {(() => {
                const summary = tagsSummary.find(
                  t => t.tag === manageTargetTag,
                );
                const isDefaultSelected = !summary?.colorKey;

                return (
                  <Pressable
                    style={[
                      styles.colorSwatch,
                      styles.defaultColorSwatch,
                      isDefaultSelected && styles.colorSwatchSelected,
                    ]}
                    onPress={applyDefaultTagColor}
                  >
                    <Text style={styles.colorSwatchLabel}>Default</Text>
                  </Pressable>
                );
              })()}

              {TAG_COLOR_OPTIONS.map(option => {
                const summary = tagsSummary.find(
                  t => t.tag === manageTargetTag,
                );
                const selectedColor = summary?.colorKey === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: option.color },
                      selectedColor && styles.colorSwatchSelected,
                    ]}
                    onPress={() => applyTagColor(option.key)}
                  >
                    <Text style={styles.colorSwatchLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.manageActions}>
              <Pressable
                style={[styles.manageButton, styles.cancelButton]}
                onPress={() => setManageModalVisible(false)}
              >
                <Text style={styles.manageButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.manageButton, styles.renameButton]}
                onPress={() => performRename()}
              >
                <Text style={styles.manageButtonText}>Rename</Text>
              </Pressable>

              <Pressable
                style={[styles.manageButton, styles.deleteButton]}
                onPress={() => confirmDeleteTag()}
              >
                <Text style={styles.manageButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function stringToColor(input: string) {
  return '#f1f5f9';
}

function getSelectedTagColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 74%, 34%)`;
}

function getColorByKey(colorKey: string) {
  const option = TAG_COLOR_OPTIONS.find(item => item.key === colorKey);
  return option ? option.color : stringToColor(colorKey);
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
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChipSelected: {
    borderColor: '#0f172a',
    borderWidth: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchModeRow: {
    marginLeft: 8,
  },
  matchModeText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  manageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manageDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    minWidth: 320,
  },
  manageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  manageLabel: {
    color: '#0f172a',
    marginTop: 8,
  },
  manageInput: {
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    color: '#0f172a',
  },
  colorSectionLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    borderRadius: 999,
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#0f172a',
  },
  defaultColorSwatch: {
    backgroundColor: '#f1f5f9',
  },
  colorSwatchLabel: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  manageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  manageButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageButtonText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  renameButton: {
    backgroundColor: '#0fee40',
  },
  deleteButton: {
    backgroundColor: '#ff4a4a',
  },
});
