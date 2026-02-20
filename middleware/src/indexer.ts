import { startIndexer } from './indexer/index';

console.log('📇 ADI Marketplace Event Indexer');
console.log('=================================\n');

startIndexer().catch(console.error);
