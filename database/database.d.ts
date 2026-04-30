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
  is_favorite: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DrawerStats = {
  allNotes: number;
  favorites: number;
  recycleBin: number;
  folders: number;
};

export function initializeDatabase(): Promise<void>;
export function createNote(input: NoteInput): Promise<NoteRecord>;
export function getAllNotes(): Promise<NoteRecord[]>;
export function getFavoriteNotes(): Promise<NoteRecord[]>;
export function getDeletedNotes(): Promise<NoteRecord[]>;
export function getNoteById(id: number): Promise<NoteRecord | null>;
export function updateNote(
  id: number,
  input: NoteInput,
): Promise<NoteRecord | null>;
export function setNoteFavorite(id: number, isFavorite: boolean): Promise<NoteRecord | null>;
export function deleteNote(id: number): Promise<boolean>;
export function permanentlyDeleteNote(id: number): Promise<boolean>;
export function getDrawerStats(): Promise<DrawerStats>;
export function restoreNote(id: number): Promise<NoteRecord | null>;
