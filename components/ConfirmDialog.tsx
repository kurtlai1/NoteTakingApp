import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ConfirmDialogProps = {
	visible: boolean;
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmDialog({
	visible,
	title = 'Confirm',
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<Modal
			animationType="fade"
			transparent
			visible={visible}
			onRequestClose={onCancel}
		>
			<View style={styles.overlay}>
				<View style={styles.dialog}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.message}>{message}</Text>

					<View style={styles.actions}>
						<Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
							<Text style={[styles.buttonText, styles.cancelText]}>{cancelText}</Text>
						</Pressable>

						<Pressable style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
							<Text style={[styles.buttonText, styles.confirmText]}>{confirmText}</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	actions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 20,
	},
	button: {
		borderRadius: 8,
		marginLeft: 10,
		paddingHorizontal: 14,
		paddingVertical: 9,
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
	confirmButton: {
		backgroundColor: '#dc2626',
	},
	confirmText: {
		color: '#ffffff',
	},
	dialog: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		minWidth: 300,
		padding: 16,
	},
	message: {
		color: '#334155',
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	overlay: {
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.45)',
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	title: {
		color: '#0f172a',
		fontSize: 18,
		fontWeight: '700',
	},
});
