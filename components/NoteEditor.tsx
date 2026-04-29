import React, { useMemo, useState } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';

export type NoteEditorValue = {
	title: string;
	body: string;
	tags: string[];
};

type NoteEditorProps = {
	initialValue?: Partial<NoteEditorValue>;
	onSave: (value: NoteEditorValue) => void;
	onCancel?: () => void;
	saveLabel?: string;
};

function parseTags(input: string): string[] {
	return input
		.split(',')
		.map(tag => tag.trim())
		.filter(Boolean);
}

export default function NoteEditor({
	initialValue,
	onSave,
	onCancel,
	saveLabel = 'Save Note',
}: NoteEditorProps) {
	const [title, setTitle] = useState(initialValue?.title ?? '');
	const [body, setBody] = useState(initialValue?.body ?? '');
	const [tagInput, setTagInput] = useState((initialValue?.tags ?? []).join(', '));

	const isSaveDisabled = useMemo(
		() => !title.trim() || !body.trim(),
		[title, body],
	);

	const handleSave = () => {
		onSave({
			body: body.trim(),
			tags: parseTags(tagInput),
			title: title.trim(),
		});
	};

	return (
		<View style={styles.container}>
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

			<Text style={styles.label}>Tags</Text>
			<TextInput
				placeholder="work, school, ideas"
				style={styles.input}
				value={tagInput}
				onChangeText={setTagInput}
			/>

			<View style={styles.actions}>
				{onCancel ? (
					<Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
						<Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
					</Pressable>
				) : null}

				<Pressable
					style={[styles.button, styles.saveButton, isSaveDisabled && styles.disabledButton]}
					disabled={isSaveDisabled}
					onPress={handleSave}
				>
					<Text style={[styles.buttonText, styles.saveText]}>{saveLabel}</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	actions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 20,
	},
	bodyInput: {
		minHeight: 120,
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
	cancelButton: {
		backgroundColor: '#e2e8f0',
	},
	cancelText: {
		color: '#0f172a',
	},
	container: {
		backgroundColor: '#ffffff',
		borderColor: '#e2e8f0',
		borderRadius: 12,
		borderWidth: 1,
		padding: 16,
	},
	disabledButton: {
		opacity: 0.5,
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
	},
	saveText: {
		color: '#ffffff',
	},
});
