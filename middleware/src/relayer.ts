import { startRelayer } from './relayer/index';

console.log('🔮 ADI Marketplace Oracle Relayer');
console.log('================================\n');

startRelayer().catch(console.error);
