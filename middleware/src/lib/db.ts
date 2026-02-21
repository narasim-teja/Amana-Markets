import { Database } from 'bun:sqlite';
import { initializeDatabase } from '../indexer/schema';
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const DB_PATH = resolve(process.env.DB_PATH || './data/indexer.db');

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

// Prevent Spotlight from indexing the DB directory (can cause vnode changes)
const noIndex = resolve(dirname(DB_PATH), '.metadata_never_index');
if (!existsSync(noIndex)) {
  try { writeFileSync(noIndex, ''); } catch {}
}

// Delete stale lock/journal files from previous runs
for (const suffix of ['-wal', '-shm', '-journal']) {
  const f = DB_PATH + suffix;
  if (existsSync(f)) try { unlinkSync(f); } catch {}
}

// Strip macOS extended attributes from existing DB file before opening
if (existsSync(DB_PATH)) {
  try { execSync(`xattr -c "${DB_PATH}"`, { stdio: 'ignore' }); } catch {}
}

// Phase 1: Create/open DB and initialize schema
let _db = new Database(DB_PATH);
_db.run('PRAGMA journal_mode = DELETE');
initializeDatabase(_db);

// Phase 2: Close, strip macOS provenance xattr (added at file creation), and reopen.
// macOS adds com.apple.provenance to files created by quarantined apps (e.g. VS Code terminal).
// This attribute can cause SQLITE_IOERR_VNODE when SQLite re-validates the file vnode.
_db.close();
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const f = DB_PATH + suffix;
  if (existsSync(f)) {
    try { execSync(`xattr -c "${f}"`, { stdio: 'ignore' }); } catch {}
  }
}

// Reopen with clean vnode
_db = new Database(DB_PATH);
_db.run('PRAGMA journal_mode = DELETE');

export const db = _db;
