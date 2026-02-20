/**
 * Contract ABIs
 * Imported from exported Foundry ABIs
 */

import OracleRouterAbi from './abis/OracleRouter.json';
import TradingEngineAbi from './abis/TradingEngine.json';
import LiquidityVaultAbi from './abis/LiquidityVault.json';
import AssetRegistryAbi from './abis/AssetRegistry.json';
import UserRegistryAbi from './abis/UserRegistry.json';
import CommodityTokenAbi from './abis/CommodityToken.json';
import PythAdapterAbi from './abis/PythAdapter.json';
import DIAAdapterAbi from './abis/DIAAdapter.json';
import RedStoneAdapterAbi from './abis/RedStoneAdapter.json';

export const ABIS = {
  OracleRouter: OracleRouterAbi,
  TradingEngine: TradingEngineAbi,
  LiquidityVault: LiquidityVaultAbi,
  AssetRegistry: AssetRegistryAbi,
  UserRegistry: UserRegistryAbi,
  CommodityToken: CommodityTokenAbi,
  PythAdapter: PythAdapterAbi,
  DIAAdapter: DIAAdapterAbi,
  RedStoneAdapter: RedStoneAdapterAbi,

  // Standard ERC20 ABI (for MockDirham and commodity tokens)
  ERC20: [
    {
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'approve',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
    {
      type: 'function',
      name: 'allowance',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'transfer',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
    {
      type: 'function',
      name: 'mint',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'decimals',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
  ],
} as const;
