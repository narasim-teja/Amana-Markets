import { startAPI } from './api/index';

console.log('🌐 ADI Marketplace REST API');
console.log('===========================\n');

const server = await startAPI();
console.log(`✅ Server running at http://localhost:${server.port}`);
