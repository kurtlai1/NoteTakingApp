import {
	CREATE_NOTES_TABLE_SQL,
	CREATE_UPDATED_AT_INDEX_SQL,
} from './schema';

type SqlRunner = {
	execAsync: (sql: string) => Promise<void>;
};

export async function runMigrations(db: SqlRunner): Promise<void> {
	await db.execAsync('BEGIN TRANSACTION;');

	try {
		await db.execAsync(CREATE_NOTES_TABLE_SQL);
		await db.execAsync(CREATE_UPDATED_AT_INDEX_SQL);
		await db.execAsync('COMMIT;');
	} catch (error) {
		await db.execAsync('ROLLBACK;');
		throw error;
	}
}
