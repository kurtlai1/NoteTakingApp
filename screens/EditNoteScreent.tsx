import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import NoteEditor from '../components/NoteEditor';
import ScreenContainer from '../components/ScreenContainer';

export default function EditNoteScreent() {
	const handleSave = () => {
		Alert.alert('Updated', 'Note has been updated successfully.');
	};

	return (
		<ScreenContainer scrollable>
			<Text style={styles.title}>Edit Note</Text>
			<Text style={styles.subtitle}>Update title, body, and tags.</Text>
			<NoteEditor
				initialValue={{
					title: 'Existing Note',
					body: 'This is existing note content that can be edited.',
					tags: ['sample', 'edit'],
				}}
				onSave={handleSave}
			/>
		</ScreenContainer>
	);
}

const styles = StyleSheet.create({
	subtitle: {
		color: '#64748b',
		marginBottom: 10,
	},
	title: {
		color: '#0f172a',
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 4,
	},
});
