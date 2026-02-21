# Amanah

Permissioned institutional trading venue bringing traditional market structure on-chain. Trade 118+ real-world assets — commodities, US & Abu Dhabi equities, ETFs, and FX pairs — with stablecoin settlement, KYC-gated access, multi-source oracle pricing, and ERC-4337 gas abstraction.

---

## The Problem

Institutional participation in digital asset markets faces structural barriers:

1. **No controlled market structure** — Most DeFi platforms are designed for open, anonymous participation with minimal governance. This doesn't meet institutional requirements for onboarding, permissions, risk limits, and operational oversight.

2. **Limited asset breadth** — Existing on-chain platforms offer narrow crypto-native assets. Institutions seeking exposure to FX, commodities, and traditional equities cannot access diversified real-world markets within a unified on-chain venue.

3. **Fragmented settlement** — Traditional markets rely on clearinghouses and delayed reconciliation. DeFi enables instant settlement but lacks permissioned frameworks and structured governance suitable for institutional deployment.

4. **Operational complexity** — Gas management, native token exposure, and wallet infrastructure introduce friction and accounting uncertainty for institutions that require predictable cost structures and stable balance sheet treatment.

There is currently no infrastructure that combines broad real-world asset exposure, institutional controls, and stablecoin-based instant settlement within a compliant, permissioned framework.

## What Amanah Enables

Amanah is a permissioned digital trading venue that brings traditional market structure on-chain.

Participants can:
- Buy and sell exposure to **FX pairs, commodities, and equities**
- Settle instantly in a **stablecoin (DDSC)**
- Operate within a **whitelist-only, governance-controlled** environment
- Access **real-time, on-chain accounting** and auditability
- Trade with **zero gas fees** via ERC-4337 account abstraction

Beyond a single exchange deployment, Amanah is architected as **whitelabel-ready market infrastructure**. Banks, brokerages, fintech platforms, or regional operators can deploy their own branded digital trading venues using the same underlying infrastructure, with configurable governance, permissions, and interface customization.

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
                      ┌──────────────────┐     │  DDSC Stablecoin        │
                      │  Alto Bundler    │────▶│  Paymasters (ERC-4337)  │
                      │  (Pimlico)       │     │  SimpleAccountFactory   │
                      └──────────────────┘     └──────────────────────────┘
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | Next.js 16, React 19, Tailwind, Privy | Trading UI, portfolio, admin dashboard |
| **Middleware** | Bun, Hono, SQLite | Oracle relayer, event indexer, REST API, sponsor signer |
| **Contracts** | Solidity 0.8.24, Foundry | On-chain trading, token minting, access control |
| **Bundler** | Pimlico Alto (self-hosted) | ERC-4337 UserOperation bundling |

---

## Features

### Trading
- **118+ assets** across 5 categories: Commodities, Abu Dhabi Equities, US Equities, ETFs, FX
- **Real-time pricing** from 5 oracle sources (Pyth, DIA, RedStone, Yahoo Finance, CSV)
- **Tokenized positions** — each asset has an ERC-20 token (xGOLD, xSILVER, xFAB, etc.)
- **Dynamic spreads** that scale with treasury utilization
- **DDSC stablecoin** (AED-pegged, 6 decimals) for all settlements

### Gas Abstraction (ERC-4337)
- **Native sponsorship** — platform covers all gas fees, users pay nothing
- **ERC-20 gas payment** — users can pay gas in DDSC instead of native ADI
- **Smart accounts** — counterfactual deployment on first transaction
- **Backend-controlled authorization** — whitelist + rate limiting + spend caps
- **Self-hosted bundler** — Pimlico Alto configured for ADI chain

> Full paymaster documentation: [`contracts/src/paymaster/README.md`](contracts/src/paymaster/README.md)

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

## Smart Contracts

All contracts are deployed on **ADI Testnet** (Chain ID: 99999).

### Core Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **TradingEngine** | `0xc1b26022DDea38072E776b8e02c5a5b8DFBC0686` | Buy/sell execution, spread calculation, position tracking |
| **AssetRegistry** | `0xd94e0296cbB2F0fd1f45456aBb08835500BDCA01` | Asset config, token deployment via factory, pause controls |
| **LiquidityVault** | `0xD5244fC906E1bA68BeBeE549deB1d98E910c7004` | Treasury capital pool, LP shares, exposure tracking |
| **UserRegistry** | `0xA9aB7a680e7bA51f2d2C541f6f1CF8983878C837` | KYC whitelist/blacklist, batch operations |

### Tokens

| Contract | Address | Purpose |
|----------|---------|---------|
| **MockDirham (DDSC)** | `0xcDD3887eCc5C56417DE280cc562aB78687296b39` | AED-pegged stablecoin (6 decimals) |
| **CommodityTokenFactory** | `0xa9861fce386613fadf590529dfcff5222292e586` | Deploys ERC-20 tokens per asset (18 decimals) |

### Oracle Infrastructure

| Contract | Address | Purpose |
|----------|---------|---------|
| **OracleRouter** | `0x7224Cf802c4e6bDE9e67C8Eec2673dB85B0B7816` | Multi-adapter price aggregation, staleness checks |
| **PythAdapter** | `0x26685486b228e4109b482696e59B1aE25afE6E29` | Pyth Hermes price relay |
| **DIAAdapter** | `0xc29b93126AA752C4984488285c25E92dA9ADbE11` | DIA RWA price relay |
| **RedStoneAdapter** | `0xc4a416b04229D28e2EE32D16637c561907664db4` | RedStone price relay |
| **ManualOracleAdapter** | `0xcB54adDdF95B6cC54B5c7B5a5275A43e1934eDd8` | Admin-controlled / CSV-based price relay |

### ERC-4337 Account Abstraction

| Contract | Address | Purpose |
|----------|---------|---------|
| **EntryPoint v0.7** | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 singleton EntryPoint |
| **SimpleAccountFactory** | `0x7a83a0FBB96273364527FDB2CE826961a76C0D63` | Deploys ERC-4337 smart accounts |
| **ADINativePaymaster** | `0x51AF1E71eF7d938015EE91AAAcEf61d471b4E36d` | Sponsors gas entirely (users pay nothing) |
| **ADIErc20Paymaster** | `0x21A223F0efD59757750c229B77C551D3fC7b04C0` | Users pay gas in DDSC stablecoin |

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
    → burns user's xTOKEN
    → transfers DDSC from LiquidityVault to user
    → updates position
    → emits TradeExecuted
```

---

## Gas Abstraction (ERC-4337 Paymasters)

Fully integrated ERC-4337 Account Abstraction with two paymasters deployed on ADI testnet. Users can trade with **zero gas fees** (native sponsorship) or **pay gas in DDSC** (ERC-20 mode).

### How It Works

```
User clicks "Trade"
  → Frontend derives smart account address (counterfactual)
  → POST /sponsor/native → Backend checks whitelist + rate limits → Signs authorization
  → Attach paymasterAndData to UserOp → Sign with account key
  → Submit to Alto Bundler → EntryPoint validates sponsor signature
  → Executes UserOp → Paymaster covers gas → User pays nothing
```

### Sponsorship Authorization Model

- **No reliance on `msg.sender`** or bundler identity
- Backend-controlled **sponsor signer** generates time-bound authorizations
- Authorization is bound to: smart account address, chainId, EntryPoint, paymaster, nonce, validity window
- Verification performed in `validatePaymasterUserOp` via ECDSA
- **Spend caps** per account prevent drainage (10 ADI native, 1000 DDSC for ERC-20)
- **Rate limiting** per account (configurable hourly cap)
- **Replay protection** via one-time sponsor nonces

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

All E2E flows verified live on ADI Testnet:

- **Flow A (Native Sponsorship)**: Zero-balance counterfactual account deployed + action executed, paymaster paid ~0.20 ADI gas
- **Flow B (ERC20 Payment)**: Account paid 0.30 DDSC for gas, paymaster covered ~0.12 ADI native
- **Failure Cases**: Invalid signature, expired sponsorship, spend cap exceeded — all revert correctly

### Test Suite

**23 unit tests** covering both paymasters: signature validation, nonce replay, spend caps, rate conversion, multi-op tracking, and all failure modes.

```bash
cd contracts
forge test --match-path "test/paymaster/*" -v
```

> Full paymaster documentation, E2E results, and reuse guide: [`contracts/src/paymaster/README.md`](contracts/src/paymaster/README.md)

---

## Admin Dashboard

Accessible at `/admin` with 5 management pages:

| Page | Path | Features |
|------|------|----------|
| **Overview** | `/admin` | Reserves, 24h volume, fees, capital utilization, live trade feed |
| **User Management** | `/admin/users` | Whitelist/blacklist, batch operations, user directory |
| **Asset Management** | `/admin/assets` | Pause/resume, spreads, exposure limits, global pause |
| **Treasury** | `/admin/treasury` | Health status, reserves, per-asset exposure breakdown |
| **Oracle Monitor** | `/admin/oracle` | Per-source health, staleness, deviation indicators |

---

## API Reference

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

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v18+)
- [Foundry](https://getfoundry.sh) (for contract deployment)

### 1. Install

```bash
git clone https://github.com/narasim-teja/Amana-Markets.git && cd Amana-Markets

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

# Deploy paymasters only
forge script script/paymaster/DeployPaymasters.s.sol -f adi_testnet --broadcast

# Run E2E paymaster demos
forge script script/paymaster/E2ENativeSponsorship.s.sol -f adi_testnet --broadcast
forge script script/paymaster/E2EErc20Sponsorship.s.sol -f adi_testnet --broadcast
```

### 4. Run

```bash
# Terminal 1 — Middleware (API + Relayer + Indexer)
cd middleware && bun run src/index.ts

# Terminal 2 — Frontend
cd frontend && bun dev

# Terminal 3 — Bundler (optional, for ERC-4337)
cd bundler && docker compose up -d
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

---

## Links

- **Paymaster Devtools Docs**: [`contracts/src/paymaster/README.md`](contracts/src/paymaster/README.md)
