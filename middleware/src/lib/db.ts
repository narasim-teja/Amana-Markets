import { Database } from 'bun:sqlite';
import { initializeDatabase } from '../indexer/schema';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DB_PATH || './data/indexer.db';

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL'); // Better concurrency

// Initialize schema on first run
initializeDatabase(db);
