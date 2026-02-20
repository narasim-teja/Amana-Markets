import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CONTRACTS_OUT = resolve(__dirname, '../../contracts/out');
const ABIS_OUT = resolve(__dirname, '../src/config/abis');

mkdirSync(ABIS_OUT, { recursive: true });

const contracts = [
  'OracleRouter',
  'PythAdapter',
  'DIAAdapter',
  'RedStoneAdapter',
  'TradingEngine',
  'LiquidityVault',
  'AssetRegistry',
  'UserRegistry',
  'CommodityToken'
];

for (const name of contracts) {
  try {
    const fullPath = `${CONTRACTS_OUT}/${name}.sol/${name}.json`;
    const fullAbi = JSON.parse(readFileSync(fullPath, 'utf-8'));

    // Extract only events and read functions we need
    const minimalAbi = fullAbi.abi.filter((item: any) => {
      if (item.type === 'event') return true;
      if (item.type === 'function' && item.stateMutability === 'view') return true;
      if (item.type === 'function' && item.name === 'updatePrice') return true; // Relayer needs this
      return false;
    });

    writeFileSync(
      `${ABIS_OUT}/${name}.json`,
      JSON.stringify(minimalAbi, null, 2)
    );

    console.log(`✅ Extracted ${name}.json (${minimalAbi.length} items)`);
  } catch (error) {
    console.error(`❌ Failed to extract ${name}:`, error);
  }
}

console.log('\n✅ ABIs extracted to src/config/abis/');
