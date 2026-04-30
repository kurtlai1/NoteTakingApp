import React, { useCallback, useMemo, useState } from 'react';
import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import NoteCard from '../components/NoteCard';
import { getAllNotes } from '../database/database';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

type HomeNote = {
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

const SORT_OPTIONS = [
	{ key: 'newest', label: 'Newest' },
	{ key: 'oldest', label: 'Oldest' },
	{ key: 'title', label: 'Title' },
];

export default function HomeScreen({ navigation }: Props) {
	const [notes, setNotes] = useState<HomeNote[]>([]);
	const [selectedFolder, setSelectedFolder] = useState('');
	const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'title'>('newest');
	const [showSortMenu, setShowSortMenu] = useState(false);
	const parentNavigation = useNavigation();

	const loadNotes = useCallback(async () => {
		try {
			const result = await getAllNotes();
			setNotes(result as HomeNote[]);
		} catch {
			setNotes([]);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadNotes();
		}, [loadNotes]),
	);

	const folders = useMemo(() => {
		const allTags = notes.flatMap(note => parseTags(note.tags));
		return Array.from(new Set(allTags)).sort((left, right) => left.localeCompare(right));
	}, [notes]);

	const filteredNotes = useMemo(() => {
		const filtered = selectedFolder
			? notes.filter(note => parseTags(note.tags).includes(selectedFolder))
			: notes;

		return [...filtered].sort((left, right) => {
			if (sortOption === 'title') {
				return left.title.localeCompare(right.title);
			}

			const leftDate = new Date(left.updated_at).getTime();
			const rightDate = new Date(right.updated_at).getTime();

			return sortOption === 'oldest' ? leftDate - rightDate : rightDate - leftDate;
		});
	}, [notes, selectedFolder, sortOption]);

	return (
		<View style={styles.container}>
			<View style={styles.topHeader}>
				<TouchableOpacity onPress={() => (parentNavigation as any).openDrawer()} style={styles.menuButton}>
					<Text style={styles.menuIcon}>☰</Text>
				</TouchableOpacity>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Home</Text>
					<Text style={styles.statsText}>
						{folders.length} folders · {filteredNotes.length} notes
					</Text>
				</View>
				<View style={styles.headerIconsRow}>
					<TouchableOpacity
						onPress={() => (parentNavigation as any).navigate('Search')}
						style={styles.iconButton}
					>
						<MaterialCommunityIcons name="magnify" size={24} color="#334155" />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => setShowSortMenu(!showSortMenu)} style={styles.iconButton}>
						<Text style={styles.headerIcon}>⋮</Text>
					</TouchableOpacity>
				</View>
			</View>

			{showSortMenu && (
				<View style={styles.sortMenuContainer}>
					<Text style={styles.sortLabel}>Sort</Text>
					<View style={styles.sortOptionsRow}>
						{SORT_OPTIONS.map(option => (
							<TouchableOpacity
								key={option.key}
								style={[
									styles.sortPill,
									sortOption === option.key && styles.sortPillActive,
								]}
								onPress={() => {
									setSortOption(option.key as 'newest' | 'oldest' | 'title');
									setShowSortMenu(false);
								}}
							>
								<Text style={sortOption === option.key ? styles.sortTextActive : styles.sortText}>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}

			<View style={styles.folderSection}>
				<Text style={styles.sectionHeading}>Folders</Text>
				<View style={styles.folderRow}>
					<TouchableOpacity
						style={[
							styles.folderPill,
							!selectedFolder && styles.folderPillActive,
						]}
						onPress={() => setSelectedFolder('')}
					>
						<Text style={styles.folderText}>All</Text>
					</TouchableOpacity>
					{folders.map(folder => (
						<TouchableOpacity
							key={folder}
							style={[
								styles.folderPill,
								selectedFolder === folder && styles.folderPillActive,
							]}
							onPress={() => setSelectedFolder(prev => (prev === folder ? '' : folder))}
						>
							<Text style={styles.folderText}>{folder}</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<Text style={styles.subtitle}>Recent notes</Text>

			<FlatList
				contentContainerStyle={styles.listContent}
				data={filteredNotes}
				keyExtractor={item => String(item.id)}
				ListEmptyComponent={
					<Text style={styles.emptyText}>
						No notes found. Create one or choose a different folder.
					</Text>
				}
				renderItem={({ item }) => (
					<NoteCard
						id={item.id}
						title={item.title}
						body={item.body}
						tags={parseTags(item.tags)}
						updated_at={item.updated_at}
						isFavorite={item.is_favorite === 1}
						onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
					/>
				)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	button: {
		backgroundColor: '#1e88e5',
		borderRadius: 8,
		marginTop: 4,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	buttonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	topHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	menuButton: {
		padding: 8,
	},
	titleContainer: {
		flex: 1,
		alignItems: 'center',
	},
	headerIconsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconButton: {
		padding: 8,
	},
	menuIcon: {
		fontSize: 28,
		fontWeight: 'bold',
		padding: 8,
	},
	headerIcon: {
		fontSize: 24,
	},
	sortMenuContainer: {
		backgroundColor: '#ffffff',
		borderBottomColor: '#e2e8f0',
		borderBottomWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 12,
	},
	container: {
		backgroundColor: '#f8fafc',
		flex: 1,
		padding: 16,
	},
	emptyText: {
		color: '#64748b',
		fontSize: 14,
		marginTop: 20,
		textAlign: 'center',
	},
	folderRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 8,
		justifyContent: 'space-between',
	},
	folderPill: {
		borderColor: '#cbd5e1',
		borderRadius: 999,
		borderWidth: 1,
		marginBottom: 8,
		paddingHorizontal: 14,
		paddingVertical: 8,
		width: '30%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	folderPillActive: {
		backgroundColor: '#1e88e5',
		borderColor: '#1e88e5',
	},
	folderSection: {
		marginTop: 16,
	},
	folderText: {
		color: '#334155',
		fontSize: 13,
		fontWeight: '600',
	},
	title: {
		fontSize: 28,
		fontWeight: '800',
		color: '#000000',
	},
	titleGroup: {
		flex: 1,
		paddingRight: 12,
	},
	sortLabel: {
		color: '#475569',
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 6,
	},
	sortOptionsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
	},
	sortPill: {
		backgroundColor: '#ffffff',
		borderColor: '#cbd5e1',
		borderRadius: 999,
		borderWidth: 1,
		marginLeft: 8,
		marginBottom: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	sortPillActive: {
		backgroundColor: '#1e88e5',
		borderColor: '#1e88e5',
	},
	sortText: {
		color: '#334155',
		fontSize: 13,
		fontWeight: '700',
	},
	sortTextActive: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
	},
	listContent: {
		paddingVertical: 8,
	},
	sectionHeading: {
		color: '#111827',
		fontSize: 15,
		fontWeight: '700',
	},
	statsText: {
		color: '#475569',
		fontSize: 14,
		marginTop: 4,
	},
	subtitle: {
		color: '#666666',
		marginTop: 12,
		marginBottom: 8,
	},
});