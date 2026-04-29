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
};

export function initializeDatabase(): Promise<void>;
export function createNote(input: NoteInput): Promise<NoteRecord>;
export function getAllNotes(): Promise<NoteRecord[]>;
export function getNoteById(id: number): Promise<NoteRecord | null>;
export function updateNote(
  id: number,
  input: NoteInput,
): Promise<NoteRecord | null>;
export function deleteNote(id: number): Promise<boolean>;
