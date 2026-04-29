export const CREATE_NOTES_TABLE_SQL = `
	CREATE TABLE IF NOT EXISTS notes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		body TEXT NOT NULL,
		tags TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
`;

export const CREATE_UPDATED_AT_INDEX_SQL = `
	CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
`;

export const DROP_NOTES_TABLE_SQL = 'DROP TABLE IF EXISTS notes;';
