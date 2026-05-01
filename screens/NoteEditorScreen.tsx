import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
  Platform,
} from 'react-native';
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

function parseTags(tags: string): string[] {
  return String(tags ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
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
    const normalized = tag.trim().toLowerCase();
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
    setSelectedTags(prev => prev.filter(item => item !== tag));
  };

  const handleAddManualTag = () => {
    addTag(manualTagInput);
    setManualTagInput('');
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

  const createdTags = useMemo(() => {
    return [...tagsSummary].sort((left, right) => {
      const leftDate = new Date(left.latest).getTime();
      const rightDate = new Date(right.latest).getTime();
      return rightDate - leftDate;
    });
  }, [tagsSummary]);

  const getTagColor = (tag: string): string => {
    const colorKey = tagColorMap[tag];
    if (!colorKey) return '#eef6ff';

    const colorOption = TAG_COLOR_OPTIONS.find(
      option => option.key === colorKey,
    );
    return colorOption ? colorOption.color : '#eef6ff';
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
      <Text style={styles.title}>Note Editor</Text>
      <Text style={styles.subtitle}>Create or update your note details.</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="Enter note title"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Body</Text>
        <TextInput
          multiline
          placeholder="Write your note..."
          style={[styles.input, styles.bodyInput]}
          textAlignVertical="top"
          value={body}
          onChangeText={setBody}
        />

        <View style={styles.inlineRow}>
          <Pressable
            style={[
              styles.actionButton,
              styles.suggestButton,
              isSuggesting && styles.disabledButton,
            ]}
            disabled={isSuggesting}
            onPress={handleSuggestTags}
          >
            <Text style={[styles.actionButtonText, styles.suggestButtonText]}>
              Suggest Tags
            </Text>
          </Pressable>

          {isSuggesting ? (
            <ActivityIndicator color="#1d4ed8" size="small" />
          ) : null}
        </View>

        {suggestedTags.length > 0 ? (
          <View style={styles.chipsWrap}>
            {suggestedTags.map(tag => (
              <Pressable
                key={tag}
                style={styles.suggestedChip}
                onPress={() => addTag(tag)}
              >
                <Text style={styles.suggestedChipText}>+ {tag}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Created Tags</Text>
        {createdTags.length > 0 ? (
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
        ) : (
          <Text style={styles.emptyTagsText}>
            No created tags yet. Add one below or suggest tags from your note.
          </Text>
        )}

        <Text style={styles.label}>Add Tag</Text>
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Type a tag"
            style={[styles.input, styles.inlineInput]}
            value={manualTagInput}
            onChangeText={setManualTagInput}
          />
          <Pressable
            style={[styles.actionButton, styles.addTagButton]}
            onPress={handleAddManualTag}
          >
            <Text style={[styles.actionButtonText, styles.addTagText]}>
              Add
            </Text>
          </Pressable>
        </View>

        {selectedTags.length > 0 ? (
          <View style={styles.chipsWrap}>
            {selectedTags.map(tag => (
              <Pressable
                key={tag}
                style={styles.selectedChip}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.selectedChipText}>{tag} x</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

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
              Save
            </Text>
          </Pressable>
        </View>
      </View>

      <ConfirmDialog
        visible={isSaveConfirmVisible}
        title="Save Note"
        message="Do you want to save this note?"
        confirmText="Save"
        onConfirm={persistNote}
        onCancel={() => setIsSaveConfirmVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addTagButton: {
    backgroundColor: '#e2e8f0',
    marginLeft: 8,
  },
  addTagText: {
    color: '#0f172a',
  },
  bodyInput: {
    minHeight: 140,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  createdTagChip: {
    borderColor: '#0f172a',
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  inlineInput: {
    flex: 1,
    marginTop: 0,
  },
  inlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
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
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyTagsText: {
    color: '#64748b',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  selectedChip: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectedChipText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 10,
  },
  suggestButton: {
    backgroundColor: '#eff6ff',
    marginRight: 10,
  },
  suggestButtonText: {
    color: '#1d4ed8',
  },
  suggestedChip: {
    backgroundColor: '#ecfeff',
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
});
