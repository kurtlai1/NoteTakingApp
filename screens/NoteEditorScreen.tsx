import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  Modal,
  View,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenContainer from '../components/ScreenContainer';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ConfirmDialog from '../components/ConfirmDialog';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import {
  createNote,
  getNoteById,
  getTagsSummary,
  TagColorKey,
  TAG_COLOR_OPTIONS,
  clearTagColor,
  setTagColor,
  updateNote,
} from '../database/database';
import { suggestTagsFromBody } from '../services/tagService';

type Props = NativeStackScreenProps<HomeStackParamList, 'NoteEditor'>;

type NoteRecord = {
  id: number;
  title: string;
  body: string;
  tags: string;
};

type TagColorTargetSource = 'manual' | 'suggested' | 'selected';

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function normalizeTag(tag: string): string {
  return String(tag ?? '')
    .trim()
    .toLowerCase();
}

function stringToColor(input: string): string {
  return '#f1f5f9';
}

function getColorByKey(colorKey: string): string {
  const option = TAG_COLOR_OPTIONS.find(item => item.key === colorKey);
  return option ? option.color : stringToColor(colorKey);
}

function mergeTags(primary: string[], secondary: string[]): string[] {
  return Array.from(
    new Set(
      [...primary, ...secondary]
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export default function NoteEditorScreen({ route, navigation }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [manualTagInput, setManualTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaveConfirmVisible, setIsSaveConfirmVisible] = useState(false);
  const [tagColorPickerVisible, setTagColorPickerVisible] = useState(false);
  const [tagColorTarget, setTagColorTarget] = useState('');
  const [tagColorTargetSource, setTagColorTargetSource] =
    useState<TagColorTargetSource | null>(null);
  const [tagColorDrafts, setTagColorDrafts] = useState<
    Record<string, TagColorKey | null>
  >({});
  const [tagsSummary, setTagsSummary] = useState<
    Array<{
      tag: string;
      count: number;
      latest: string;
      colorKey: TagColorKey | null;
    }>
  >([]);

  const noteId = route.params?.noteId;

  const canSave = useMemo(() => title.trim() && body.trim(), [title, body]);

  useFocusEffect(
    React.useCallback(() => {
      const loadNote = async () => {
        if (!noteId) {
          setTitle('');
          setBody('');
          setSelectedTags([]);
          return;
        }

        const note = (await getNoteById(noteId)) as NoteRecord | null;
        if (!note) {
          return;
        }

        setTitle(note.title);
        setBody(note.body);
        setSelectedTags(parseTags(note.tags));
      };

      loadNote();
    }, [noteId]),
  );

  useFocusEffect(
    React.useCallback(() => {
      const loadTagsSummary = async () => {
        try {
          const result = await getTagsSummary();
          setTagsSummary(result);
        } catch {
          setTagsSummary([]);
        }
      };

      loadTagsSummary();
    }, []),
  );

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }

    Alert.alert('Info', message);
  };

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    setSelectedTags(prev => {
      if (prev.includes(normalized)) {
        return prev;
      }

      return [...prev, normalized];
    });
  };

  const toggleTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      return;
    }

    setSelectedTags(prev =>
      prev.includes(normalized)
        ? prev.filter(item => item !== normalized)
        : [...prev, normalized],
    );
  };

  const removeTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags(prev =>
      prev.filter(item => normalizeTag(item) !== normalized),
    );
  };

  const handleAddManualTag = () => {
    openTagColorPicker(manualTagInput, 'manual');
  };

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsSummary.forEach(summary => {
      if (summary.colorKey) {
        map[normalizeTag(summary.tag)] = summary.colorKey;
      }
    });
    return map;
  }, [tagsSummary]);

  const getResolvedTagColorKey = useCallback(
    (tag: string): TagColorKey | null => {
      const normalizedTag = normalizeTag(tag);

      if (Object.prototype.hasOwnProperty.call(tagColorDrafts, normalizedTag)) {
        return tagColorDrafts[normalizedTag] ?? null;
      }

      return (tagColorMap[normalizedTag] as TagColorKey | undefined) ?? null;
    },
    [tagColorDrafts, tagColorMap],
  );

  const getResolvedTagColor = useCallback(
    (tag: string): string => {
      const colorKey = getResolvedTagColorKey(tag);
      return colorKey ? getColorByKey(colorKey) : stringToColor(tag);
    },
    [getResolvedTagColorKey],
  );

  function openTagColorPicker(tag: string, source: TagColorTargetSource) {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return;
    }

    setTagColorTarget(normalizedTag);
    setTagColorTargetSource(source);
    setTagColorPickerVisible(true);
  }

  function closeTagColorPicker() {
    setTagColorPickerVisible(false);
    setTagColorTarget('');
    setTagColorTargetSource(null);
  }

  function commitTagWithColor() {
    const normalizedTag = normalizeTag(tagColorTarget);
    if (!normalizedTag) {
      closeTagColorPicker();
      return;
    }

    if (tagColorTargetSource !== 'selected') {
      addTag(normalizedTag);
      if (tagColorTargetSource === 'manual') {
        setManualTagInput('');
      }
    }

    closeTagColorPicker();
  }

  const createdTags = useMemo(() => {
    return [...tagsSummary].sort((left, right) => {
      const leftDate = new Date(left.latest).getTime();
      const rightDate = new Date(right.latest).getTime();
      return rightDate - leftDate;
    });
  }, [tagsSummary]);

  const getTagColor = (tag: string): string => {
    const colorKey = getResolvedTagColorKey(tag);
    if (!colorKey) return stringToColor(tag);

    const colorOption = TAG_COLOR_OPTIONS.find(
      option => option.key === colorKey,
    );
    return colorOption ? colorOption.color : stringToColor(tag);
  };

  const handleSuggestTags = async () => {
    if (!body.trim()) {
      showToast('Write some note content first');
      return;
    }

    setIsSuggesting(true);

    try {
      const suggestions = await suggestTagsFromBody(body, title);
      setSuggestedTags(suggestions);
      showToast(suggestions.length > 0 ? 'Tags suggested' : 'No tags found');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Tag suggestion failed';
      showToast(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = () => {
    if (!canSave) {
      showToast('Title and body are required');
      return;
    }

    setIsSaveConfirmVisible(true);
  };

  const persistNote = async () => {
    try {
      const mergedTags = mergeTags(selectedTags, parseTags(manualTagInput));

      const payload = {
        body: body.trim(),
        tags: mergedTags,
        title: title.trim(),
      };

      const saved = noteId
        ? await updateNote(noteId, payload)
        : await createNote(payload);

      const colorOps = mergedTags
        .map(tag => {
          const normalized = normalizeTag(tag);
          if (
            !Object.prototype.hasOwnProperty.call(tagColorDrafts, normalized)
          ) {
            return null;
          }

          return {
            tag,
            colorKey: tagColorDrafts[normalized],
          };
        })
        .filter(Boolean) as Array<{
        tag: string;
        colorKey: TagColorKey | null;
      }>;

      if (colorOps.length > 0) {
        await Promise.all(
          colorOps.map(entry =>
            entry.colorKey
              ? setTagColor(entry.tag, entry.colorKey)
              : clearTagColor(entry.tag),
          ),
        );
      }

      setSelectedTags(mergedTags);
      setManualTagInput('');
      setIsSaveConfirmVisible(false);
      showToast('Note saved');
      const savedId = Number((saved as { id: number }).id);
      navigation.replace('NoteDetail', { noteId: savedId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save note';
      setIsSaveConfirmVisible(false);
      showToast(message);
    }
  };

  return (
    <ScreenContainer scrollable>

      <Text style={styles.subtitle}>Create or update your note details.</Text>

      {/* Note Content Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Note Content</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            placeholder="Enter note title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Body</Text>
          <TextInput
            multiline
            placeholder="Write your note..."
            style={[styles.input, styles.bodyInput]}
            textAlignVertical="top"
            value={body}
            onChangeText={setBody}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Tag Suggestions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tag Suggestions</Text>
          <Pressable
            style={[
              styles.actionButton,
              styles.suggestButton,
              isSuggesting && styles.disabledButton,
            ]}
            disabled={isSuggesting}
            onPress={handleSuggestTags}
          >
            {isSuggesting ? (
              <ActivityIndicator color="#1d4ed8" size="small" />
            ) : (
              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={14}
                color="#1d4ed8"
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.actionButtonText, styles.suggestButtonText]}>
              Suggest
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {suggestedTags.length > 0 ? (
            <View style={styles.chipsWrap}>
              {suggestedTags.map(tag => (
                <Pressable
                  key={tag}
                  style={styles.suggestedChip}
                  onPress={() => openTagColorPicker(tag, 'suggested')}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={13}
                    color="#0e7490"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.suggestedChipText}>{tag}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>
              Write some content and tap "Suggest" to get AI-powered tag
              suggestions
            </Text>
          )}
        </View>
      </View>

      {/* Available Tags Section */}
      {createdTags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Tags ({createdTags.length})
          </Text>
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {createdTags.map(item => {
                const normalizedTag = item.tag.trim().toLowerCase();
                const isSelected = selectedTags.includes(normalizedTag);

                return (
                  <Pressable
                    key={item.tag}
                    style={[
                      styles.createdTagChip,
                      { backgroundColor: getTagColor(item.tag) },
                      isSelected && styles.createdTagChipSelected,
                    ]}
                    onPress={() => toggleTag(item.tag)}
                  >
                    <Text style={styles.createdTagChipText}>{item.tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {/* Add Tag Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add New Tag</Text>
        <View style={styles.card}>
          <View style={styles.addTagRow}>
            <TextInput
              placeholder="Type a tag name"
              style={[styles.input, styles.inlineInput]}
              value={manualTagInput}
              onChangeText={setManualTagInput}
              placeholderTextColor="#94a3b8"
            />
            <Pressable
              style={[styles.actionButton, styles.addTagButton]}
              onPress={handleAddManualTag}
            >
              <MaterialCommunityIcons
                name="plus"
                size={14}
                color="#0f172a"
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.actionButtonText, styles.addTagText]}>
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Selected Tags Section */}
      {selectedTags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Tags ({selectedTags.length})
          </Text>
          <View style={styles.card}>
            <View style={styles.selectedTagsList}>
              {selectedTags.map(tag => (
                <View key={tag} style={styles.selectedTagItem}>
                  <Pressable
                    style={[
                      styles.selectedTagChip,
                      { backgroundColor: getResolvedTagColor(tag) },
                    ]}
                    onPress={() => removeTag(tag)}
                  >
                    <Text style={styles.selectedChipText}>{tag}</Text>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={16}
                      color="#334155"
                      style={{ marginLeft: 8 }}
                    />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.colorAssignButton,
                      { borderColor: getResolvedTagColor(tag) },
                    ]}
                    onPress={() => openTagColorPicker(tag, 'selected')}
                  >
                    <View
                      style={[
                        styles.colorIndicator,
                        { backgroundColor: getResolvedTagColor(tag) },
                      ]}
                    />
                    <Text style={styles.colorAssignButtonText}>Color</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.footerActions}>
        <Pressable
          style={[
            styles.actionButton,
            styles.saveButton,
            !canSave && styles.disabledButton,
          ]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <Text style={[styles.actionButtonText, styles.saveButtonText]}>
            Save Note
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={isSaveConfirmVisible}
        title="Save Note"
        message="Do you want to save this note?"
        confirmText="Save"
        onConfirm={persistNote}
        onCancel={() => setIsSaveConfirmVisible(false)}
      />

      <Modal
        visible={tagColorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTagColorPicker}
      >
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerDialog}>
            <Text style={styles.colorPickerTitle}>Tag color</Text>
            <Text style={styles.colorPickerLabel}>
              {tagColorTargetSource === 'selected' ? 'Update' : 'Add'} color for
              "{tagColorTarget}"
            </Text>

            <View style={styles.colorPickerSwatches}>
              {(() => {
                const selected =
                  getResolvedTagColorKey(tagColorTarget) === null;

                return (
                  <Pressable
                    style={[
                      styles.colorPickerSwatch,
                      styles.defaultColorSwatch,
                      selected && styles.colorPickerSwatchSelected,
                    ]}
                    onPress={() => {
                      setTagColorDrafts(prev => ({
                        ...prev,
                        [normalizeTag(tagColorTarget)]: null,
                      }));
                    }}
                  >
                    <Text style={styles.colorPickerSwatchText}>Default</Text>
                  </Pressable>
                );
              })()}

              {TAG_COLOR_OPTIONS.map(option => {
                const selected =
                  getResolvedTagColorKey(tagColorTarget) === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.colorPickerSwatch,
                      { backgroundColor: option.color },
                      selected && styles.colorPickerSwatchSelected,
                    ]}
                    onPress={() => {
                      setTagColorDrafts(prev => ({
                        ...prev,
                        [normalizeTag(tagColorTarget)]: option.key,
                      }));
                    }}
                  >
                    <Text style={styles.colorPickerSwatchText}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.colorPickerActions}>
              <Pressable
                style={[styles.actionButton, styles.cancelColorButton]}
                onPress={closeTagColorPicker}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.cancelColorButtonText,
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.saveColorButton]}
                onPress={commitTagWithColor}
              >
                <Text
                  style={[styles.actionButtonText, styles.saveColorButtonText]}
                >
                  {tagColorTargetSource === 'selected' ? 'Update' : 'Add Tag'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addTagButton: {
    backgroundColor: '#e2e8f0',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addTagText: {
    color: '#0f172a',
  },
  bodyInput: {
    minHeight: 140,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorAssignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  colorAssignButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  createdTagChip: {
    borderColor: '#0f172a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createdTagChipSelected: {
    borderWidth: 2,
  },
  createdTagChipText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyStateText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    marginBottom: 20,
  },
  inlineInput: {
    flex: 1,
    marginTop: 0,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    color: '#ffffff',
  },
  section: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  selectedChipText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  selectedTagItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedTagsList: {
    gap: 8,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 16,
  },
  suggestButton: {
    backgroundColor: '#eff6ff',
    gap: 4,
  },
  suggestButtonText: {
    color: '#1d4ed8',
  },
  suggestedChip: {
    backgroundColor: '#ecfeff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedChipText: {
    color: '#0e7490',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  colorPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  colorPickerDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    width: '92%',
  },
  colorPickerLabel: {
    color: '#64748b',
    marginTop: 4,
  },
  colorPickerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
  },
  colorPickerSwatch: {
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    marginRight: 8,
    minWidth: '30%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  colorPickerSwatchSelected: {
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  defaultColorSwatch: {
    backgroundColor: '#f1f5f9',
  },
  colorPickerSwatchText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  colorPickerSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  colorPickerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelColorButton: {
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  cancelColorButtonText: {
    color: '#0f172a',
  },
  saveColorButton: {
    backgroundColor: '#2563eb',
  },
  saveColorButtonText: {
    color: '#ffffff',
  },
});
