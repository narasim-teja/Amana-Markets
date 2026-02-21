# ADI Commodities Marketplace

Institutional-grade tokenized commodity trading platform built on the ADI blockchain (Abu Dhabi Innovation Chain). Trade 118+ real-world assets — commodities, US & Abu Dhabi equities, ETFs, and FX pairs — with multi-source oracle pricing, KYC-gated access, and a treasury-backed liquidity model.

Built at **ETHDenver 2026**.

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│   Frontend   │────▶│    Middleware     │────▶│   ADI Testnet (99999)    │
│  Next.js 16  │     │  Bun + Hono API  │     │                          │
│  React 19    │     │                  │     │  TradingEngine           │
│  Privy Auth  │     │  Relayer (5 src) │     │  AssetRegistry (118+)   │
│  viem        │     │  Indexer (SQLite) │     │  LiquidityVault         │
│  TanStack    │     │  REST API        │     │  OracleRouter + Adapters │
└──────────────┘     └──────────────────┘     │  UserRegistry (KYC)     │
                                               │  CommodityTokenFactory  │
                                               │  DDSC Stablecoin        │
                                               └──────────────────────────┘
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | Next.js 16, React 19, Tailwind, Privy | Trading UI, portfolio, admin dashboard |
| **Middleware** | Bun, Hono, SQLite | Oracle relayer, event indexer, REST API |
| **Contracts** | Solidity 0.8.24, Foundry | On-chain trading, token minting, access control |

---

## Features

### Trading
- **118+ assets** across 5 categories: Commodities, Abu Dhabi Equities, US Equities, ETFs, FX
- **Real-time pricing** from 5 oracle sources (Pyth, DIA, RedStone, Yahoo Finance, CSV)
- **Tokenized positions** — each asset has an ERC-20 token (xGOLD, xSILVER, xFAB, etc.)
- **Dynamic spreads** that scale with treasury utilization
- **DDSC stablecoin** (AED-pegged, 6 decimals) for all settlements
- **Trusted price mode** — prices passed from frontend for gas-efficient execution

### Oracle System
- **5 data sources** fetched in parallel every 60 minutes
- **On-chain adapters** — PythAdapter, DIAAdapter, RedStoneAdapter, ManualOracleAdapter
- **OracleRouter** aggregates all sources, provides freshest/median price
- **Staleness protection** — 2-hour max staleness, reverts if all sources stale
- **Abu Dhabi stocks** powered by historical CSV data (1-year daily OHLCV)

### Security & Access Control
- **KYC whitelist** — only whitelisted addresses can trade or provide liquidity
- **Blacklist** — compliance enforcement for blocked addresses
- **Batch operations** — admin can whitelist/blacklist multiple addresses at once
- **Per-asset pause** — emergency halt trading on individual assets
- **Global pause** — halt all trading across the platform
- **Exposure limits** — max treasury exposure per asset, max single trade size

### Portfolio
- Real-time portfolio valuation (holdings x oracle price x FX rate)
- Cost basis tracking per position
- Full trade history with timestamps

---

## Asset Coverage

| Category | Count | Source | Examples |
|----------|-------|--------|----------|
| **Commodities** | 20 | Pyth, RedStone, Yahoo | Gold, Silver, Oil, Copper, Wheat, Coffee |
| **Abu Dhabi Equities** | 10 | CSV (historical) | FAB, Aldar, ADIB, Alpha Dhabi, IHC |
| **US Equities** | 60 | DIA | AAPL, MSFT, GOOGL, NVDA, TSLA, JPM |
| **ETFs** | 15 | DIA | SPY, QQQ, TLT, IBIT, GBTC, ARKB |
| **FX Pairs** | 13 | DIA | EUR, GBP, JPY, AUD, CHF, CNY |

---

## Admin Dashboard

Accessible at `/admin` with 5 management pages:

### Overview (`/admin`)
- Total reserves, 24h volume, fees collected, trade count
- Capital utilization gauge (safe / warning / critical zones)
- Live trade feed
- Oracle health summary

### User Management (`/admin/users`)
- Whitelist / blacklist individual addresses
- Batch whitelist via textarea (one address per line)
- User directory with status, trade count, volume
- Search and filter by status

### Asset Management (`/admin/assets`)
- Pause / resume trading per asset
- Adjust spread (basis points) per asset
- Update max exposure limits
- Emergency pause all trading
- Configure AED/USD exchange rate
- Set max capital utilization %

### Treasury (`/admin/treasury`)
- Health status banner (healthy / warning / critical)
- Total reserves, exposure, available capital, reserve ratio
- Per-asset exposure breakdown with progress bars
- Recent treasury activity

### Oracle Monitor (`/admin/oracle`)
- Per-asset health across all 5 sources
- Expandable rows with per-source price, timestamp, deviation
- Filter by category, source, health status
- Staleness and deviation indicators

---

## Smart Contracts

Deployed on **ADI Testnet** (Chain ID: 99999).

| Contract | Purpose |
|----------|---------|
| **TradingEngine** | Buy/sell execution, spread calculation, position tracking |
| **AssetRegistry** | Asset config, token deployment via factory, pause controls |
| **LiquidityVault** | Treasury capital pool, LP shares, exposure tracking |
| **OracleRouter** | Multi-adapter price aggregation, staleness checks |
| **UserRegistry** | KYC whitelist/blacklist, batch operations |
| **MockDirham (DDSC)** | AED-pegged stablecoin (6 decimals), testnet faucet |
| **CommodityTokenFactory** | Deploys ERC-20 tokens per asset (18 decimals) |
| **PythAdapter** | Pyth Hermes price relay |
| **DIAAdapter** | DIA RWA price relay |
| **RedStoneAdapter** | RedStone price relay |
| **ManualOracleAdapter** | Admin-controlled / CSV-based price relay |
| **ADINativePaymaster** | ERC-4337 paymaster: sponsors gas for free |
| **ADIErc20Paymaster** | ERC-4337 paymaster: users pay gas in DDSC |
| **SimpleAccountFactory** | Deploys ERC-4337 smart accounts |

### Trade Flow

```
Buy:
  User approves DDSC spend
    → TradingEngine.buy(assetId, ddscAmount, usdPrice)
      → checks KYC via UserRegistry
      → calculates output tokens (price + spread + fee)
      → transfers DDSC from user to LiquidityVault
      → mints xTOKEN to user
      → updates position cost basis
      → emits TradeExecuted

Sell:
  TradingEngine.sell(assetId, tokenAmount, usdPrice)
    → burns user's xTOKEN (minter privilege, no approval needed)
    → transfers DDSC from LiquidityVault to user
    → updates position
    → emits TradeExecuted
```

---

## Middleware API

REST API served by Hono on port 3000.

| Endpoint | Description |
|----------|-------------|
| `GET /config` | Contract addresses + chain config |
| `GET /assets` | All registered assets |
| `GET /assets/:id` | Single asset details |
| `GET /prices/live` | Real-time prices from all 5 sources |
| `GET /prices/live/:id` | Live price for specific asset |
| `GET /prices/:id/history?range=` | Historical chart data (1h, 24h, 7d, 30d, 1y) |
| `GET /prices/median/:id` | Median price across sources |
| `GET /trades` | Recent trades (paginated) |
| `GET /trades/:address` | Trades by user address |
| `GET /treasury/stats` | Capital utilization metrics |
| `GET /treasury/exposure` | Per-asset exposure breakdown |
| `GET /users` | All known users with whitelist status |
| `GET /analytics/volume` | Volume by period |
| `GET /analytics/fees` | Fee collection stats |
| `GET /analytics/traders` | Trader statistics |
| `GET /health` | Service health check |
| `POST /sponsor/native` | Generate native gas sponsorship data |
| `POST /sponsor/erc20` | Generate ERC20 gas sponsorship data |
| `GET /sponsor/status/:address` | Check sponsorship eligibility |
| `GET /sponsor/config` | Paymaster configuration |

---

## Gas Abstraction (ERC-4337 Paymasters)

Fully integrated ERC-4337 Account Abstraction with two paymasters deployed on ADI testnet. Users can trade with **zero gas fees** (native sponsorship) or **pay gas in DDSC** (ERC-20 mode).

> Full documentation: [`contracts/src/paymaster/README.md`](contracts/src/paymaster/README.md)

### How It Works

```
User (Frontend)
  → POST /sponsor/native → Backend checks whitelist + rate limits → Signs authorization
  → Attach paymasterAndData to UserOp → Submit to Alto Bundler
  → EntryPoint validates sponsor signature → Executes UserOp → Paymaster covers gas
```

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| **ADINativePaymaster** | `contracts/src/paymaster/` | Sponsors gas entirely (users pay nothing) |
| **ADIErc20Paymaster** | `contracts/src/paymaster/` | Users pay gas in DDSC stablecoin |
| **SponsorshipLib** | `contracts/src/paymaster/` | Shared encoding/hashing library |
| **Sponsor API** | `middleware/src/api/routes/sponsor.ts` | Backend signer + rate limiting |
| **Alto Bundler** | `bundler/docker-compose.yml` | Self-hosted Pimlico bundler |
| **Frontend Hooks** | `frontend/src/hooks/blockchain/` | `useSponsoredWrite`, `useSponsorshipStatus` |

### Testnet Verification

All E2E flows verified live on ADI Testnet (Chain ID: 99999):

- **Flow A (Native Sponsorship)**: Zero-balance account deployed + action executed, paymaster paid ~0.20 ADI gas
- **Flow B (ERC20 Payment)**: Account paid 0.30 DDSC for gas, paymaster covered ~0.12 ADI native
- **Failure Cases**: Invalid signature, expired sponsorship, spend cap exceeded -- all revert correctly

### Deployed Paymaster Addresses

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| ADINativePaymaster | `0x51AF1E71eF7d938015EE91AAAcEf61d471b4E36d` |
| ADIErc20Paymaster | `0x21A223F0efD59757750c229B77C551D3fC7b04C0` |
| SimpleAccountFactory | `0x7a83a0FBB96273364527FDB2CE826961a76C0D63` |

### Quick Start

```bash
# Run E2E demos
cd contracts
forge script script/paymaster/E2ENativeSponsorship.s.sol -f adi_testnet --broadcast
forge script script/paymaster/E2EErc20Sponsorship.s.sol -f adi_testnet --broadcast

# Run 23 unit tests
forge test --match-path "test/paymaster/*" -v
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v18+)
- [Foundry](https://getfoundry.sh) (for contract deployment)

### 1. Install

```bash
git clone <repo-url> && cd ethdenver

cd contracts && forge install && cd ..
cd middleware && bun install && cd ..
cd frontend && bun install && cd ..
```

### 2. Environment

```bash
# Middleware
cp middleware/.env.example middleware/.env
# Set contract addresses, RPC URL, API keys

# Frontend
cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_* contract addresses, Privy app ID
```

### 3. Deploy Contracts (optional — already live on ADI Testnet)

```bash
cd contracts

# Full deploy (all contracts + 118 assets)
forge script script/RedeployAll.s.sol --rpc-url adi_testnet --broadcast

# Or register just the 10 ADX stocks on existing registry
forge script script/RegisterADXStocks.s.sol --rpc-url adi_testnet --broadcast
```

### 4. Run

```bash
# Terminal 1 — Middleware (API + Relayer + Indexer)
cd middleware && bun run src/index.ts

# Terminal 2 — Frontend
cd frontend && bun dev
```

Middleware runs on `http://localhost:3000`, frontend on `http://localhost:3001`.

---

## Network

| Property | Value |
|----------|-------|
| **Chain** | ADI Testnet |
| **Chain ID** | 99999 |
| **Currency** | ADI (18 decimals) |
| **RPC** | `https://rpc.ab.testnet.adifoundation.ai/` |
| **Explorer** | `https://explorer.ab.testnet.adifoundation.ai` |

---

## Project Structure

```
ethdenver/
├── contracts/                    # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── core/                # TradingEngine, AssetRegistry, LiquidityVault
│   │   ├── oracle/              # OracleRouter + 4 adapters
│   │   ├── access/              # UserRegistry (KYC)
│   │   ├── tokens/              # CommodityToken, MockDirham (DDSC)
│   │   ├── libraries/           # AssetIds, PriceLib
│   │   └── paymaster/           # ERC-4337 Paymasters (Native + ERC20)
│   ├── test/paymaster/          # 23 paymaster unit tests
│   └── script/paymaster/        # Deploy, E2E demos, CLI tools
│
├── middleware/                   # Backend services (Bun + Hono)
│   ├── src/
│   │   ├── api/routes/          # REST endpoints + /sponsor routes
│   │   ├── relayer/fetchers/    # Pyth, DIA, RedStone, Yahoo, CSV
│   │   ├── indexer/             # On-chain event indexer
│   │   ├── services/            # Live prices, sponsorship signer
│   │   └── config/              # Assets, oracles
│   └── historical-data/         # ADX stock CSV files (1-year daily)
│
├── bundler/                     # Pimlico Alto bundler (Docker)
│
└── frontend/                    # Web app (Next.js 16)
    └── src/
        ├── app/                 # Pages: trade, portfolio, admin/*
        ├── components/          # Charts, dialogs, UI
        ├── hooks/blockchain/    # API + blockchain + sponsorship hooks
        └── lib/                 # API client, asset metadata, contracts
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Blockchain | Solidity 0.8.24, Foundry, viem |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Bun, Hono, SQLite |
| Auth | Privy.io (embedded wallets) |
| Charts | Lightweight Charts |
| State | TanStack React Query |
| Oracles | Pyth, DIA, RedStone, Yahoo Finance |
| Account Abstraction | ERC-4337 v0.7, Pimlico Alto bundler |
| Paymasters | ADINativePaymaster, ADIErc20Paymaster |
| Stablecoin | DDSC (AED-pegged, 6 decimals) |
