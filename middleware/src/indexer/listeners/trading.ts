import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

export async function indexTradeEvents(fromBlock: bigint, toBlock: bigint) {
  const logs = await publicClient.getLogs({
    address: CONTRACTS.TradingEngine.address,
    event: {
      type: 'event',
      name: 'TradeExecuted',
      inputs: [
        { indexed: true, name: 'trader', type: 'address' },
        { indexed: true, name: 'assetId', type: 'bytes32' },
        { indexed: false, name: 'isBuy', type: 'bool' },
        { indexed: false, name: 'stablecoinAmount', type: 'uint256' },
        { indexed: false, name: 'tokenAmount', type: 'uint256' },
        { indexed: false, name: 'oraclePriceUsd', type: 'uint256' },
        { indexed: false, name: 'effectivePriceLocal', type: 'uint256' },
        { indexed: false, name: 'spreadBps', type: 'uint256' },
        { indexed: false, name: 'fee', type: 'uint256' },
        { indexed: false, name: 'timestamp', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  const insert = db.prepare(`
    INSERT OR IGNORE INTO trades (
      id, block_number, timestamp, trader, asset_id, is_buy,
      stablecoin_amount, token_amount, oracle_price, effective_price,
      spread_bps, fee, tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const log of logs) {
    const { trader, assetId, isBuy, stablecoinAmount, tokenAmount, oraclePriceUsd,
            effectivePriceLocal, spreadBps, fee, timestamp } = log.args as any;

    const id = `${log.transactionHash}-${log.logIndex}`;

    insert.run(
      id,
      Number(log.blockNumber),
      Number(timestamp),
      trader.toLowerCase(),
      assetId,
      isBuy ? 1 : 0,
      stablecoinAmount.toString(),
      tokenAmount.toString(),
      oraclePriceUsd.toString(),
      effectivePriceLocal.toString(),
      spreadBps.toString(),
      fee.toString(),
      log.transactionHash
    );
  }

  return logs.length;
}
