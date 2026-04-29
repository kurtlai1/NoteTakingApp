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
import { createNote, getNoteById, updateNote } from '../database/database';
import { suggestTagsFromBody } from '../services/tagService';
import {
  connectSync,
  disconnectSync,
  publishNote,
  subscribeToNotes,
} from '../services/syncService';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [incomingNotePreview, setIncomingNotePreview] = useState<{
    title: string;
    bodyPreview: string;
  } | null>(null);
  const [isSaveConfirmVisible, setIsSaveConfirmVisible] = useState(false);

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

  useEffect(() => {
    const unsubscribe = subscribeToNotes(note => {
      const syncedTitle = String(note.title ?? 'Untitled note').trim() || 'Untitled note';
      const syncedBody = String(note.body ?? '').trim();

      setIncomingNotePreview({
        title: syncedTitle,
        bodyPreview: syncedBody.slice(0, 50),
      });

      showToast('Sync update received');
    });

    return () => {
      unsubscribe();
      disconnectSync();
    };
  }, []);

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

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(item => item !== tag));
  };

  const handleAddManualTag = () => {
    addTag(manualTagInput);
    setManualTagInput('');
  };

  const handleSuggestTags = async () => {
    if (!body.trim()) {
      showToast('Write some note content first');
      return;
    }

    setIsSuggesting(true);

    try {
      const suggestions = await suggestTagsFromBody(body);
      setSuggestedTags(suggestions);
      showToast(suggestions.length > 0 ? 'Tags suggested' : 'No tags found');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tag suggestion failed';
      showToast(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSyncNote = async () => {
    setIsSyncing(true);

    try {
      await publishNote({
        body: body.trim(),
        tags: selectedTags,
        title: title.trim(),
        updated_at: new Date().toISOString(),
      });
      showToast('Note synced successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      showToast(message);
    } finally {
      setIsSyncing(false);
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
      const message = error instanceof Error ? error.message : 'Failed to save note';
      setIsSaveConfirmVisible(false);
      showToast(message);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Text style={styles.title}>Note Editor</Text>
      <Text style={styles.subtitle}>Create or update your note details.</Text>

      {incomingNotePreview ? (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerTitle}>Incoming Sync: {incomingNotePreview.title}</Text>
          <Text style={styles.syncBannerBody}>{incomingNotePreview.bodyPreview}</Text>
          <Pressable
            style={styles.syncBannerDismiss}
            onPress={() => setIncomingNotePreview(null)}
          >
            <Text style={styles.syncBannerDismissText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

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
            style={[styles.actionButton, styles.suggestButton, isSuggesting && styles.disabledButton]}
            disabled={isSuggesting}
            onPress={handleSuggestTags}
          >
            <Text style={[styles.actionButtonText, styles.suggestButtonText]}>
              Suggest Tags
            </Text>
          </Pressable>

          {isSuggesting ? <ActivityIndicator color="#1d4ed8" size="small" /> : null}
        </View>

        {suggestedTags.length > 0 ? (
          <View style={styles.chipsWrap}>
            {suggestedTags.map(tag => (
              <Pressable key={tag} style={styles.suggestedChip} onPress={() => addTag(tag)}>
                <Text style={styles.suggestedChipText}>+ {tag}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Add Tag</Text>
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Type a tag"
            style={[styles.input, styles.inlineInput]}
            value={manualTagInput}
            onChangeText={setManualTagInput}
          />
          <Pressable style={[styles.actionButton, styles.addTagButton]} onPress={handleAddManualTag}>
            <Text style={[styles.actionButtonText, styles.addTagText]}>Add</Text>
          </Pressable>
        </View>

        {selectedTags.length > 0 ? (
          <View style={styles.chipsWrap}>
            {selectedTags.map(tag => (
              <Pressable key={tag} style={styles.selectedChip} onPress={() => removeTag(tag)}>
                <Text style={styles.selectedChipText}>{tag} x</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <Pressable
            style={[styles.actionButton, styles.syncButton, isSyncing && styles.disabledButton]}
            disabled={isSyncing}
            onPress={handleSyncNote}
          >
            <Text style={[styles.actionButtonText, styles.syncButtonText]}>
              {isSyncing ? 'Syncing...' : 'Sync Note'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.saveButton, !canSave && styles.disabledButton]}
            disabled={!canSave}
            onPress={handleSave}
          >
            <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save</Text>
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
  saveButton: {
    backgroundColor: '#2563eb',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  syncBanner: {
    backgroundColor: '#ecfeff',
    borderColor: '#99f6e4',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  syncBannerBody: {
    color: '#155e75',
    fontSize: 13,
    marginTop: 4,
  },
  syncBannerDismiss: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  syncBannerDismissText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  syncBannerTitle: {
    color: '#0e7490',
    fontSize: 14,
    fontWeight: '700',
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
  syncButton: {
    backgroundColor: '#0f766e',
    marginLeft: 10,
  },
  syncButtonText: {
    color: '#ffffff',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
});
