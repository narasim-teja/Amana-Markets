import { Database } from 'bun:sqlite';

export function initializeDatabase(db: Database) {
  // Prices table
  db.run(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      source TEXT NOT NULL,
      price TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      UNIQUE(asset_id, source, timestamp)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_asset ON prices(asset_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp)`);

  // Trades table
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      trader TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      is_buy INTEGER NOT NULL,
      stablecoin_amount TEXT NOT NULL,
      token_amount TEXT NOT NULL,
      oracle_price TEXT NOT NULL,
      effective_price TEXT NOT NULL,
      spread_bps TEXT NOT NULL,
      fee TEXT NOT NULL,
      tx_hash TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_asset ON trades(asset_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)`);

  // Vault events table
  db.run(`
    CREATE TABLE IF NOT EXISTS vault_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      lp TEXT,
      amount TEXT,
      shares TEXT,
      asset_id TEXT,
      asset_exposure TEXT,
      total_exposure TEXT,
      tx_hash TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_vault_lp ON vault_events(lp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vault_timestamp ON vault_events(timestamp)`);

  // User events table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      tx_hash TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_address ON user_events(address)`);

  // Assets table (from registry events)
  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      asset_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      token_address TEXT NOT NULL,
      is_paused INTEGER DEFAULT 0,
      spread_bps INTEGER,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);

  // Indexer state (track last indexed block)
  db.run(`
    CREATE TABLE IF NOT EXISTS indexer_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_block INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`INSERT OR IGNORE INTO indexer_state (id, last_block) VALUES (1, 0)`);

  console.log('✅ Database schema initialized');
}
