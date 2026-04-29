import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
	updated_at: string;
};

function parseTags(tags: string): string[] {
	return String(tags ?? '')
		.split(',')
		.map(tag => tag.trim())
		.filter(Boolean);
}

export default function HomeScreen({ navigation }: Props) {
	const [notes, setNotes] = useState<HomeNote[]>([]);

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

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Home</Text>
			<Text style={styles.subtitle}>Recent notes</Text>

			<FlatList
				contentContainerStyle={styles.listContent}
				data={notes}
				keyExtractor={item => String(item.id)}
				ListEmptyComponent={
					<Text style={styles.emptyText}>No notes yet. Create one to get started.</Text>
				}
				renderItem={({ item }) => (
					<NoteCard
						id={item.id}
						title={item.title}
						body={item.body}
						tags={parseTags(item.tags)}
						updated_at={item.updated_at}
						onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
					/>
				)}
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={() => navigation.navigate('NoteEditor', {})}
			>
				<Text style={styles.buttonText}>Create New Note</Text>
			</TouchableOpacity>
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
	listContent: {
		paddingVertical: 8,
	},
	subtitle: {
		color: '#666666',
		marginTop: 4,
		marginBottom: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
	},
});
