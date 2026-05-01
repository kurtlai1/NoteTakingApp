import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenContainer from '../components/ScreenContainer';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { deleteNote, getNoteById, setNoteFavorite } from '../database/database';

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

	const [showMenu, setShowMenu] = useState(false);

	const tags = parseTags(note?.tags ?? '');

	// Set header options with star and three-dots
	useEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
					{/* Star favorite */}
					<Pressable
						onPress={handleToggleFavorite}
						style={{ padding: 8 }}
					>
						<MaterialCommunityIcons
							name={note?.is_favorite === 1 ? 'star' : 'star-outline'}
							size={24}
							color={note?.is_favorite === 1 ? '#fbbf24' : '#cbd5e1'}
						/>
					</Pressable>

					{/* Three-dots menu button */}
					<Pressable
						onPress={() => setShowMenu(!showMenu)}
						style={{ padding: 8 }}
					>
						<MaterialCommunityIcons name="dots-vertical" size={24} color="#334155" />
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
							<MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
							<Text style={styles.menuItemText}>Delete</Text>
						</Pressable>
					</View>
				</>
			)}

			{!noteId ? null : (
				<>
					{/* Note title */}
					<Text style={styles.title}>{note?.title ?? 'New Note'}</Text>
					<Text style={styles.updatedAt}>
						{note?.updated_at ? `Updated ${formatDate(note.updated_at)}` : 'No saved content yet'}
					</Text>

					{/* Tags */}
					{tags.length > 0 ? (
						<>
							<Text style={styles.subheading}>Tags</Text>
							<View style={styles.tagsRow}>
								{tags.map(tag => (
									<View key={tag} style={styles.tagChip}>
										<Text style={styles.tagText}>#{tag}</Text>
									</View>
								))}
							</View>
						</>
					) : null}

				</>
			)}

			<Text style={styles.bodyText}>
				{note?.body ?? 'This note has no content yet. Tap Edit to create your note.'}
			</Text>

			{/* Edit button below notes on right side */}
			<Pressable style={styles.editButton} onPress={handleOpenEditor}>
				<Text style={styles.editButtonText}>Edit</Text>
			</Pressable>

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
	bodyText: {
		color: '#1f2937',
		fontSize: 15,
		lineHeight: 24,
		marginTop: 16,
	},
	editButton: {
		alignSelf: 'flex-end',
		backgroundColor: '#1e88e5',
		borderRadius: 6,
		paddingHorizontal: 20,
		paddingVertical: 10,
		marginTop: 16,
		marginBottom: 8,
	},
	editButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#ffffff',
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
	subheading: {
		color: '#475569',
		fontSize: 13,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 8,
	},
});
