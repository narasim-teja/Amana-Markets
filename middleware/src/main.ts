/**
 * Single-process entry point for all middleware services.
 * Avoids SQLite race conditions from multiple processes sharing the same DB.
 */

import { startAPI } from './api/index';
import { startRelayer } from './relayer/index';
import { startIndexer } from './indexer/index';

console.log('🏗️  ADI Marketplace Middleware');
console.log('==============================\n');

// Start API server first (initialises DB schema)
const server = await startAPI();
console.log(`✅ API running at http://localhost:${server.port}`);

// Start background services
startIndexer().catch(console.error);
startRelayer().catch(console.error);

console.log('\n✅ All services started');
