import SQLite from 'react-native-sqlite-storage';

const DB_NAME = 'notes.db';
const TABLE_NAME = 'notes';
const TAG_COLORS_TABLE_NAME = 'tag_colors';

export const TAG_COLOR_OPTIONS = [
  { key: 'red', label: 'Red', color: '#fca5a5' },
  { key: 'orange', label: 'Orange', color: '#fdba74' },
  { key: 'yellow', label: 'Yellow', color: '#fde68a' },
  { key: 'green', label: 'Green', color: '#a7f3d0' },
  { key: 'blue', label: 'Blue', color: '#93c5fd' },
  { key: 'indigo', label: 'Indigo', color: '#c4b5fd' },
  { key: 'pink', label: 'Pink', color: '#fbcfe8' },
] as const;

export type TagColorKey = (typeof TAG_COLOR_OPTIONS)[number]['key'];

SQLite.enablePromise(true);

let dbPromise: Promise<any>;
let initialized = false;

export type NoteInput = {
  title: string;
  body: string;
  tags?: string[] | string;
};

export type NoteRecord = {
  id: number;
  title: string;
  body: string;
  tags: string;
  created_at: string;
  updated_at: string;
  is_favorite: number;
  deleted_at: string | null;
};

function getDb(): Promise<any> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });
  }

  return dbPromise;
}

function wrapDbError(operation: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to ${operation}: ${message}`);
}

async function executeSql(sql: string, params: unknown[] = []): Promise<any> {
  const db = await getDb();
  const [result] = await db.executeSql(sql, params);
  return result;
}

function rowsToArray(result: any): NoteRecord[] {
  const rows: NoteRecord[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }

  return rows;
}

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initializeDatabase();
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function isTagColorKey(value: unknown): value is TagColorKey {
  return TAG_COLOR_OPTIONS.some(option => option.key === value);
}

function normalizeTags(tags: unknown): string {
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

function validateWriteInput(input: unknown): {
  title: string;
  body: string;
  tags: string;
} {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: note payload is required.');
  }

  const title = String((input as any).title ?? '').trim();
  const body = String((input as any).body ?? '').trim();
  const tags = normalizeTags((input as any).tags);

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

function validateId(id: unknown): number {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Validation failed: id must be a positive integer.');
  }

  return numericId;
}

export async function initializeDatabase(): Promise<void> {
  try {
    await executeSql(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    );

    await executeSql(
      `
      CREATE TABLE IF NOT EXISTS ${TAG_COLORS_TABLE_NAME} (
        tag TEXT PRIMARY KEY NOT NULL,
        color_key TEXT NOT NULL
      );
    `,
    );
    // Add migration for new columns
    try {
      await executeSql(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;`,
      );
    } catch {
      // Column already exists
    }

    try {
      await executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN deleted_at TEXT;`);
    } catch {
      // Column already exists
    }

    initialized = true;
  } catch (error) {
    throw wrapDbError('initialize database', error);
  }
}

export async function createNote(input: NoteInput): Promise<NoteRecord> {
  try {
    await ensureInitialized();
    const { title, body, tags } = validateWriteInput(input);
    const timestamp = nowIso();

    const result = await executeSql(
      `
      INSERT INTO ${TABLE_NAME} (title, body, tags, created_at, updated_at, is_favorite, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [title, body, tags, timestamp, timestamp, 0, null],
    );

    return {
      id: result.insertId,
      title,
      body,
      tags,
      created_at: timestamp,
      updated_at: timestamp,
      is_favorite: 0,
      deleted_at: null,
    };
  } catch (error) {
    throw wrapDbError('create note', error);
  }
}

export async function getAllNotes(): Promise<NoteRecord[]> {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, created_at, updated_at, is_favorite, deleted_at
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

export async function getNoteById(id: number): Promise<NoteRecord | null> {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `
      SELECT id, title, body, tags, created_at, updated_at, is_favorite, deleted_at
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

export async function updateNote(
  id: number,
  input: NoteInput,
): Promise<NoteRecord | null> {
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

export async function deleteNote(id: number): Promise<boolean> {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `UPDATE ${TABLE_NAME} SET deleted_at = ? WHERE id = ?`,
      [nowIso(), noteId],
    );

    return (result.rowsAffected ?? 0) > 0;
  } catch (error) {
    throw wrapDbError('delete note', error);
  }
}

export async function getDeletedNotes(): Promise<NoteRecord[]> {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, created_at, updated_at, is_favorite, deleted_at
      FROM ${TABLE_NAME}
      WHERE deleted_at IS NOT NULL
      ORDER BY updated_at DESC
      `,
    );

    return rowsToArray(result);
  } catch (error) {
    throw wrapDbError('fetch deleted notes', error);
  }
}

export async function permanentlyDeleteNote(id: number): Promise<boolean> {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [
      noteId,
    ]);

    return (result.rowsAffected ?? 0) > 0;
  } catch (error) {
    throw wrapDbError('permanently delete note', error);
  }
}

export async function restoreNote(id: number): Promise<NoteRecord | null> {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `UPDATE ${TABLE_NAME} SET deleted_at = NULL WHERE id = ?`,
      [noteId],
    );

    if ((result.rowsAffected ?? 0) === 0) {
      throw new Error(`Note with id ${noteId} does not exist.`);
    }

    return getNoteById(noteId);
  } catch (error) {
    throw wrapDbError('restore note', error);
  }
}

export async function setNoteFavorite(
  id: number,
  isFavorite: boolean,
): Promise<NoteRecord | null> {
  try {
    await ensureInitialized();
    const noteId = validateId(id);
    const result = await executeSql(
      `UPDATE ${TABLE_NAME} SET is_favorite = ? WHERE id = ?`,
      [isFavorite ? 1 : 0, noteId],
    );

    if ((result.rowsAffected ?? 0) === 0) {
      throw new Error(`Note with id ${noteId} does not exist.`);
    }

    return getNoteById(noteId);
  } catch (error) {
    throw wrapDbError('set note favorite', error);
  }
}

export async function getFavoriteNotes(): Promise<NoteRecord[]> {
  try {
    await ensureInitialized();
    const result = await executeSql(
      `
      SELECT id, title, body, tags, created_at, updated_at, is_favorite, deleted_at
      FROM ${TABLE_NAME}
      WHERE is_favorite = 1 AND deleted_at IS NULL
      ORDER BY updated_at DESC
      `,
    );

    return rowsToArray(result);
  } catch (error) {
    throw wrapDbError('fetch favorite notes', error);
  }
}

export async function getDrawerStats(): Promise<{
  allNotes: number;
  favorites: number;
  recycleBin: number;
  tags: number;
}> {
  try {
    await ensureInitialized();

    const allNotesResult = await executeSql(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE deleted_at IS NULL`,
    );

    const favoritesResult = await executeSql(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE is_favorite = 1 AND deleted_at IS NULL`,
    );

    const recycleBinResult = await executeSql(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE deleted_at IS NOT NULL`,
    );

    const allNotes = await executeSql(
      `SELECT tags FROM ${TABLE_NAME} WHERE deleted_at IS NULL`,
    );
    const allTags = new Set<string>();
    for (let i = 0; i < allNotes.rows.length; i += 1) {
      const row = allNotes.rows.item(i);
      const tags = String(row.tags ?? '')
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean);
      tags.forEach((tag: string) => allTags.add(tag));
    }

    return {
      allNotes: allNotesResult.rows.item(0).count,
      favorites: favoritesResult.rows.item(0).count,
      recycleBin: recycleBinResult.rows.item(0).count,
      tags: allTags.size,
    };
  } catch (error) {
    throw wrapDbError('fetch drawer stats', error);
  }
}

export async function getTagsSummary(): Promise<
  Array<{
    tag: string;
    count: number;
    latest: string;
    colorKey: TagColorKey | null;
  }>
> {
  try {
    await ensureInitialized();

    const result = await executeSql(
      `SELECT id, tags, updated_at FROM ${TABLE_NAME} WHERE deleted_at IS NULL`,
    );
    const colorResult = await executeSql(
      `SELECT tag, color_key FROM ${TAG_COLORS_TABLE_NAME}`,
    );

    const map = new Map<string, { count: number; latest: string }>();
    const colorMap = new Map<string, TagColorKey>();

    for (let i = 0; i < colorResult.rows.length; i += 1) {
      const row = colorResult.rows.item(i);
      const colorKey = row.color_key;
      if (typeof row.tag === 'string' && isTagColorKey(colorKey)) {
        colorMap.set(row.tag, colorKey);
      }
    }

    for (let i = 0; i < result.rows.length; i += 1) {
      const row = result.rows.item(i);
      const tags = String(row.tags ?? '')
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);

      tags.forEach((tag: string) => {
        const prev = map.get(tag);
        const updatedAt = String(row.updated_at ?? '');
        if (!prev) {
          map.set(tag, { count: 1, latest: updatedAt });
        } else {
          prev.count += 1;
          if (updatedAt > prev.latest) {
            prev.latest = updatedAt;
          }
          map.set(tag, prev);
        }
      });
    }

    return Array.from(map.entries()).map(([tag, v]) => ({
      tag,
      count: v.count,
      latest: v.latest,
      colorKey: colorMap.get(tag) ?? null,
    }));
  } catch (error) {
    throw wrapDbError('fetch tags summary', error);
  }
}

export async function setTagColor(
  tag: string,
  colorKey: TagColorKey,
): Promise<void> {
  try {
    await ensureInitialized();
    const normalizedTag = String(tag).trim();
    if (!normalizedTag) return;
    if (!isTagColorKey(colorKey)) {
      throw new Error('Invalid color selection.');
    }

    await executeSql(
      `
      INSERT INTO ${TAG_COLORS_TABLE_NAME} (tag, color_key)
      VALUES (?, ?)
      ON CONFLICT(tag) DO UPDATE SET color_key = excluded.color_key
    `,
      [normalizedTag, colorKey],
    );
  } catch (error) {
    throw wrapDbError('set tag color', error);
  }
}

export async function renameTag(oldTag: string, newTag: string): Promise<void> {
  try {
    await ensureInitialized();
    const normalizedOld = String(oldTag).trim();
    const normalizedNew = String(newTag).trim();
    if (!normalizedOld) return;

    const notes = await getAllNotes();

    for (const note of notes) {
      const tags = String(note.tags ?? '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (!tags.includes(normalizedOld)) continue;

      const newTagsSet = new Set(tags.filter(t => t !== normalizedOld));
      if (normalizedNew) newTagsSet.add(normalizedNew);

      const newTags = Array.from(newTagsSet).join(',');

      await executeSql(
        `UPDATE ${TABLE_NAME} SET tags = ?, updated_at = ? WHERE id = ?`,
        [newTags, nowIso(), note.id],
      );
    }

    if (normalizedNew && normalizedNew !== normalizedOld) {
      await executeSql(
        `UPDATE ${TAG_COLORS_TABLE_NAME} SET tag = ? WHERE tag = ?`,
        [normalizedNew, normalizedOld],
      );
    } else if (!normalizedNew || normalizedNew !== normalizedOld) {
      await executeSql(`DELETE FROM ${TAG_COLORS_TABLE_NAME} WHERE tag = ?`, [
        normalizedOld,
      ]);
    }
  } catch (error) {
    throw wrapDbError('rename tag', error);
  }
}

export async function deleteTag(tagToDelete: string): Promise<void> {
  try {
    await ensureInitialized();
    const normalized = String(tagToDelete).trim();
    if (!normalized) return;

    const notes = await getAllNotes();

    for (const note of notes) {
      const tags = String(note.tags ?? '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (!tags.includes(normalized)) continue;

      const newTags = tags.filter(t => t !== normalized).join(',');
      await executeSql(
        `UPDATE ${TABLE_NAME} SET tags = ?, updated_at = ? WHERE id = ?`,
        [newTags, nowIso(), note.id],
      );
    }

    await executeSql(`DELETE FROM ${TAG_COLORS_TABLE_NAME} WHERE tag = ?`, [
      normalized,
    ]);
  } catch (error) {
    throw wrapDbError('delete tag', error);
  }
}
