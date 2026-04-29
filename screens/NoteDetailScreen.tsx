import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenContainer from '../components/ScreenContainer';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { deleteNote, getNoteById } from '../database/database';

type Props = NativeStackScreenProps<HomeStackParamList, 'NoteDetail'>;

type NoteRecord = {
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

	useFocusEffect(
		useCallback(() => {
			loadNote();
		}, [loadNote]),
	);

	const handleDelete = async () => {
		if (!noteId) {
			setIsDeleteDialogVisible(false);
			return;
		}

		await deleteNote(noteId);
		setIsDeleteDialogVisible(false);
		navigation.navigate('HomeMain');
	};

	const handleOpenEditor = () => {
		navigation.replace('NoteEditor', noteId ? { noteId } : {});
	};

	const tags = parseTags(note?.tags ?? '');

	return (
		<ScreenContainer scrollable>
			{!noteId ? null : (
				<>
			<View style={styles.headerRow}>
				<Text style={styles.title}>{note?.title ?? 'New Note'}</Text>
				<Text style={styles.updatedAt}>
					{note?.updated_at ? `Updated ${formatDate(note.updated_at)}` : 'No saved content yet'}
				</Text>
			</View>

			{tags.length > 0 ? (
				<View style={styles.tagsRow}>
					{tags.map(tag => (
						<View key={tag} style={styles.tagChip}>
							<Text style={styles.tagText}>#{tag}</Text>
						</View>
					))}
				</View>
			) : null}

			<Text style={styles.bodyText}>
				{note?.body ?? 'This note has no content yet. Tap Edit to create your note.'}
			</Text>

			<View style={styles.actions}>
				<Pressable style={[styles.button, styles.editButton]} onPress={handleOpenEditor}>
					<Text style={[styles.buttonText, styles.editText]}>
						{note ? 'Edit' : 'Create'}
					</Text>
				</Pressable>

				{note ? (
					<Pressable
						style={[styles.button, styles.deleteButton]}
						onPress={() => setIsDeleteDialogVisible(true)}
					>
						<Text style={[styles.buttonText, styles.deleteText]}>Delete</Text>
					</Pressable>
				) : null}
			</View>

			<ConfirmDialog
				visible={isDeleteDialogVisible}
				title="Delete Note"
				message="This action cannot be undone. Are you sure you want to delete this note?"
				confirmText="Delete"
				onConfirm={handleDelete}
				onCancel={() => setIsDeleteDialogVisible(false)}
			/>
				</>
			)}
		</ScreenContainer>
	);
}

const styles = StyleSheet.create({
	actions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 24,
	},
	bodyText: {
		color: '#1f2937',
		fontSize: 15,
		lineHeight: 24,
		marginTop: 16,
	},
	button: {
		borderRadius: 8,
		marginLeft: 10,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	buttonText: {
		fontSize: 14,
		fontWeight: '600',
	},
	deleteButton: {
		backgroundColor: '#fee2e2',
	},
	deleteText: {
		color: '#b91c1c',
	},
	editButton: {
		backgroundColor: '#e0e7ff',
	},
	editText: {
		color: '#1d4ed8',
	},
	headerRow: {
		alignItems: 'flex-start',
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
		marginTop: 8,
	},
	tagText: {
		color: '#1565c0',
		fontSize: 12,
		fontWeight: '600',
	},
	title: {
		color: '#0f172a',
		fontSize: 24,
		fontWeight: '700',
	},
	updatedAt: {
		color: '#64748b',
		marginTop: 6,
	},
});
