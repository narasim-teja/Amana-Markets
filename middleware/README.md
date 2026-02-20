# ADI Commodities Marketplace - Middleware

Middleware layer for the ADI Commodities Marketplace consisting of three services:
1. **Oracle Relayer** - Fetches commodity prices from external APIs and pushes to on-chain adapters
2. **Event Indexer** - Listens to blockchain events and stores them in SQLite
3. **REST API** - Provides HTTP endpoints for frontend queries

## 📦 Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Blockchain**: viem
- **HTTP Server**: Hono
- **Database**: bun:sqlite (built-in)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

The `.env` file is already configured with deployed contract addresses.

**Critical variable to verify**:
- `RELAYER_PRIVATE_KEY` - Private key for relayer wallet (needs gas for transactions)

### 3. Run Services

**Option A: Run all services together**
```bash
bun run dev
```

**Option B: Run services individually**
```bash
# Terminal 1 - Oracle Relayer
bun run relayer

# Terminal 2 - Event Indexer
bun run indexer

# Terminal 3 - REST API
bun run api
```

## 🌐 REST API Endpoints

### Prices
- `GET /prices` - All latest prices
- `GET /prices/:assetId` - Prices for specific asset
- `GET /prices/median/:assetId` - Median price

### Assets
- `GET /assets` - All registered assets
- `GET /assets/:assetId` - Specific asset

### Trades
- `GET /trades?limit=50` - Recent trades
- `GET /trades/:address` - Trades by address

### Vault
- `GET /vault/stats` - Vault statistics
- `GET /vault/exposure` - Asset exposure
- `GET /vault/deposits` - Deposit history

### Analytics
- `GET /analytics/volume?period=24h` - Trade volume
- `GET /analytics/fees` - Fee stats
- `GET /analytics/traders` - Trader stats

### Health
- `GET /health` - Service health check

## 🧪 Testing

```bash
# Test API
curl http://localhost:3000/health

# Check database
bun sqlite3 data/indexer.db "SELECT COUNT(*) FROM trades"
```
