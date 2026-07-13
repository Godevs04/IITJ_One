import * as SQLite from 'expo-sqlite';

/**
 * Local-only structured storage for Timetable and Notes.
 * Personal data — never synced to the server.
 */

export type ClassType = 'lecture' | 'lab' | 'tutorial';

export interface TimetableEntry {
  id: string;
  className: string;
  startTime: string;
  endTime: string;
  classType: ClassType;
  daysOfWeek: string[];
  room: string | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('iitj1-local.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS timetable (
      id TEXT PRIMARY KEY NOT NULL,
      class_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      class_type TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      room TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 1,
      reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

function parseDays(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function listTimetableEntries(): Promise<TimetableEntry[]> {
  const database = await getLocalDb();
  const rows = await database.getAllAsync<{
    id: string;
    class_name: string;
    start_time: string;
    end_time: string;
    class_type: ClassType;
    days_of_week: string;
    room: string | null;
    reminder_enabled: number;
    reminder_minutes_before: number;
    created_at: string;
  }>('SELECT * FROM timetable ORDER BY start_time ASC');

  return rows.map((row) => ({
    id: row.id,
    className: row.class_name,
    startTime: row.start_time,
    endTime: row.end_time,
    classType: row.class_type,
    daysOfWeek: parseDays(row.days_of_week),
    room: row.room,
    reminderEnabled: row.reminder_enabled === 1,
    reminderMinutesBefore: row.reminder_minutes_before,
    createdAt: row.created_at,
  }));
}

export async function listNotes(): Promise<Note[]> {
  const database = await getLocalDb();
  const rows = await database.getAllAsync<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM notes ORDER BY updated_at DESC');

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveTimetableEntry(entry: TimetableEntry): Promise<void> {
  const database = await getLocalDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO timetable
      (id, class_name, start_time, end_time, class_type, days_of_week, room, reminder_enabled, reminder_minutes_before, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.className,
    entry.startTime,
    entry.endTime,
    entry.classType,
    JSON.stringify(entry.daysOfWeek),
    entry.room,
    entry.reminderEnabled ? 1 : 0,
    entry.reminderMinutesBefore,
    entry.createdAt,
  );
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  const database = await getLocalDb();
  await database.runAsync('DELETE FROM timetable WHERE id = ?', id);
}

export async function getTimetableEntry(id: string): Promise<TimetableEntry | null> {
  const database = await getLocalDb();
  const row = await database.getFirstAsync<{
    id: string;
    class_name: string;
    start_time: string;
    end_time: string;
    class_type: ClassType;
    days_of_week: string;
    room: string | null;
    reminder_enabled: number;
    reminder_minutes_before: number;
    created_at: string;
  }>('SELECT * FROM timetable WHERE id = ?', id);

  if (!row) return null;
  return {
    id: row.id,
    className: row.class_name,
    startTime: row.start_time,
    endTime: row.end_time,
    classType: row.class_type,
    daysOfWeek: parseDays(row.days_of_week),
    room: row.room,
    reminderEnabled: row.reminder_enabled === 1,
    reminderMinutesBefore: row.reminder_minutes_before,
    createdAt: row.created_at,
  };
}

export async function saveNote(note: Note): Promise<void> {
  const database = await getLocalDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    note.id,
    note.title,
    note.body,
    note.createdAt,
    note.updatedAt,
  );
}

export async function deleteNote(id: string): Promise<void> {
  const database = await getLocalDb();
  await database.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export async function getNote(id: string): Promise<Note | null> {
  const database = await getLocalDb();
  const row = await database.getFirstAsync<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM notes WHERE id = ?', id);

  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
