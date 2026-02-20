import { Database } from 'bun:sqlite';
import { initializeDatabase } from '../indexer/schema';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { dirname, resolve } from 'path';

const DB_PATH = resolve(process.env.DB_PATH || './data/indexer.db');

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

// Clean up stale WAL/SHM files that can cause SQLITE_IOERR_VNODE on macOS
for (const suffix of ['-wal', '-shm']) {
  const f = DB_PATH + suffix;
  if (existsSync(f)) {
    try { unlinkSync(f); } catch {}
  }
}

export const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = DELETE'); // Avoid WAL cross-process issues on macOS

// Initialize schema on first run
initializeDatabase(db);
