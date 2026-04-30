import SQLite from 'react-native-sqlite-storage';

const DB_NAME = 'notes.db';
const TABLE_NAME = 'notes';

SQLite.enablePromise(true);

let dbPromise;
let initialized = false;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });
  }

  return dbPromise;
}

function wrapDbError(operation, error) {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to ${operation}: ${message}`);
}

async function executeSql(sql, params = []) {
  const db = await getDb();
  const [result] = await db.executeSql(sql, params);
  return result;
}

function rowsToArray(result) {
  const rows = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }

  return rows;
}

async function ensureInitialized() {
  if (!initialized) {
    await initializeDatabase();
  }
}

async function hasColumn(columnName) {
  const result = await executeSql(`PRAGMA table_info(${TABLE_NAME});`);
  const columns = rowsToArray(result);
  return columns.some(column => column.name === columnName);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => String(tag).trim())
      .filter(Boolean)
      .join(',');
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .join(',');
  }

  return '';
}

function validateWriteInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: note payload is required.');
  }

  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  const tags = normalizeTags(input.tags);

  if (!title) {
    throw new Error('Validation failed: title is required.');
  }

  if (!body) {
    throw new Error('Validation failed: body is required.');
  }

  if (title.length > 255) {
    throw new Error('Validation failed: title must be 255 characters or less.');
  }

  return { title, body, tags };
}

function validateId(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Validation failed: id must be a positive integer.');
  }

  return numericId;
}

export async function initializeDatabase() {
  try {
    await executeSql(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        tags TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    );

    if (!(await hasColumn('is_favorite'))) {
      await executeSql(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;`,
      );
    }

    if (!(await hasColumn('deleted_at'))) {
      await executeSql(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN deleted_at TEXT;`,
      );
    }

    initialized = true;
  } catch (error) {
    throw wrapDbError('initialize database', error);
  }
}

export async function createNote(input) {
  try {
    await ensureInitialized();
    const { title, body, tags } = validateWriteInput(input);
    const timestamp = nowIso();

    const result = await executeSql(
      `
      INSERT INTO ${TABLE_NAME} (title, body, tags, is_favorite, deleted_at, created_at, updated_at)
      VALUES (?, ?, ?, 0, NULL, ?, ?)
    `,
      [title, body, tags, timestamp, timestamp],
    );

    return {
      id: result.insertId,
      title,
      body,
      tags,
      is_favorite: 0,
      deleted_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
  } catch (error) {
    throw wrapDbError('create note', error);
  }
}

export async function getAllNotes() {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, is_favorite, deleted_at, created_at, updated_at
      FROM ${TABLE_NAME}
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
    `,
    );

    return rowsToArray(result);
  } catch (error) {
    throw wrapDbError('fetch notes', error);
  }
}

export async function getFavoriteNotes() {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, is_favorite, deleted_at, created_at, updated_at
      FROM ${TABLE_NAME}
      WHERE deleted_at IS NULL AND is_favorite = 1
      ORDER BY updated_at DESC
    `,
    );

    return rowsToArray(result);
  } catch (error) {
    throw wrapDbError('fetch favorite notes', error);
  }
}

export async function getDeletedNotes() {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, is_favorite, deleted_at, created_at, updated_at
      FROM ${TABLE_NAME}
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `,
    );

    return rowsToArray(result);
  } catch (error) {
    throw wrapDbError('fetch deleted notes', error);
  }
}

export async function getNoteById(id) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `
      SELECT id, title, body, tags, is_favorite, deleted_at, created_at, updated_at
      FROM ${TABLE_NAME}
      WHERE id = ?
      LIMIT 1
    `,
      [noteId],
    );

    return result.rows.length > 0 ? result.rows.item(0) : null;
  } catch (error) {
    throw wrapDbError('fetch note', error);
  }
}

export async function updateNote(id, input) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const { title, body, tags } = validateWriteInput(input);
    const updatedAt = nowIso();

    const result = await executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET title = ?, body = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `,
      [title, body, tags, updatedAt, noteId],
    );

    if ((result.rowsAffected ?? 0) === 0) {
      throw new Error(`Note with id ${noteId} does not exist.`);
    }

    return getNoteById(noteId);
  } catch (error) {
    throw wrapDbError('update note', error);
  }
}

export async function deleteNote(id) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const deletedAt = nowIso();
    const result = await executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `,
      [deletedAt, deletedAt, noteId],
    );

    return (result.rowsAffected ?? 0) > 0;
  } catch (error) {
    throw wrapDbError('move note to recycle bin', error);
  }
}

export async function permanentlyDeleteNote(id) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `DELETE FROM ${TABLE_NAME} WHERE id = ? AND deleted_at IS NOT NULL`,
      [noteId],
    );

    return (result.rowsAffected ?? 0) > 0;
  } catch (error) {
    throw wrapDbError('permanently delete note', error);
  }
}

export async function restoreNote(id) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const updatedAt = nowIso();
    const result = await executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET deleted_at = NULL, updated_at = ?
      WHERE id = ? AND deleted_at IS NOT NULL
    `,
      [updatedAt, noteId],
    );

    if ((result.rowsAffected ?? 0) === 0) {
      return null;
    }

    return getNoteById(noteId);
  } catch (error) {
    throw wrapDbError('restore note', error);
  }
}

export async function setNoteFavorite(id, isFavorite) {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const updatedAt = nowIso();
    const favoriteValue = isFavorite ? 1 : 0;
    const result = await executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET is_favorite = ?, updated_at = ?
      WHERE id = ?
    `,
      [favoriteValue, updatedAt, noteId],
    );

    if ((result.rowsAffected ?? 0) === 0) {
      throw new Error(`Note with id ${noteId} does not exist.`);
    }

    return getNoteById(noteId);
  } catch (error) {
    throw wrapDbError('update favorite status', error);
  }
}

export async function getDrawerStats() {
  try {
    await ensureInitialized();
    const [allResult, favoriteResult, deletedResult, folderResult] = await Promise.all([
      executeSql(`SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE deleted_at IS NULL`),
      executeSql(
        `SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE deleted_at IS NULL AND is_favorite = 1`,
      ),
      executeSql(`SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE deleted_at IS NOT NULL`),
      executeSql(`SELECT tags FROM ${TABLE_NAME} WHERE deleted_at IS NULL AND tags IS NOT NULL`),
    ]);

    const allNotes = Number(allResult.rows.item(0)?.total ?? 0);
    const favorites = Number(favoriteResult.rows.item(0)?.total ?? 0);
    const recycleBin = Number(deletedResult.rows.item(0)?.total ?? 0);

    const folderSet = new Set();
    rowsToArray(folderResult).forEach(row => {
      String(row.tags ?? '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .forEach(tag => folderSet.add(tag));
    });

    return {
      allNotes,
      favorites,
      recycleBin,
      folders: folderSet.size,
    };
  } catch (error) {
    throw wrapDbError('fetch drawer stats', error);
  }
}
