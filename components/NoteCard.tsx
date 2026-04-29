import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type NoteCardProps = {
	id: string | number;
	title: string;
	body: string;
	tags: string[];
	updated_at: string | number | Date;
	onPress: (id: string | number) => void;
};

function formatUpdatedAt(value: NoteCardProps['updated_at']): string {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return 'Invalid date';
	}

	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}

export default function NoteCard({
	id,
	title,
	body,
	tags,
	updated_at,
	onPress,
}: NoteCardProps) {
	return (
		<Pressable onPress={() => onPress(id)} style={styles.card}>
			<View style={styles.headerRow}>
				<Text style={styles.title} numberOfLines={1}>
					{title}
				</Text>
				<Text style={styles.updatedAt}>{formatUpdatedAt(updated_at)}</Text>
			</View>

			<Text style={styles.bodyPreview} numberOfLines={2} ellipsizeMode="tail">
				{body}
			</Text>

			<View style={styles.tagsRow}>
				{tags.map(tag => (
					<View key={`${id}-${tag}`} style={styles.tagChip}>
						<Text style={styles.tagText}>#{tag}</Text>
					</View>
				))}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	bodyPreview: {
		color: '#455a64',
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	card: {
		backgroundColor: '#ffffff',
		borderColor: '#e3ebf3',
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 12,
		padding: 14,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
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
		marginTop: 4,
	},
	tagText: {
		color: '#1565c0',
		fontSize: 12,
		fontWeight: '600',
	},
	title: {
		color: '#1f2937',
		flex: 1,
		fontSize: 17,
		fontWeight: '700',
		marginRight: 8,
	},
	updatedAt: {
		color: '#6b7280',
		fontSize: 12,
	},
});
