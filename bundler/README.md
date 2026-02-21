# Alto Bundler for ADI Testnet

Self-hosted [Pimlico Alto](https://github.com/pimlicolabs/alto) bundler for ERC-4337 Account Abstraction on ADI Testnet (Chain ID: 99999).

## Option A: Run Without Docker (Recommended)

Faster to get started — no Docker needed.

```bash
# 1. Clone Alto
git clone https://github.com/pimlicolabs/alto.git
cd alto

# 2. Install and build
pnpm install
pnpm build:contracts
pnpm build

# 3. Run for ADI testnet
./alto run \
  --entrypoints 0x0000000071727De22E5E9d8BAf0edAc6f37da032 \
  --executor-private-keys "0xYOUR_FUNDED_PRIVATE_KEY" \
  --utility-private-key "0xYOUR_FUNDED_PRIVATE_KEY" \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/ \
  --min-balance 0 \
  --safe-mode false \
  --port 4337
```

The executor key needs ADI tokens to submit bundles on-chain. You can use the same admin key.

## Option B: Docker

```bash
# 1. Configure
cp .env.example .env
# Edit .env — set BUNDLER_PRIVATE_KEY (with 0x prefix)

# 2. Build and run (first time takes a few minutes)
docker compose up -d

# 3. Check logs
docker compose logs -f
```

## Verify It's Running

```bash
curl -s http://localhost:4337 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_supportedEntryPoints","params":[],"id":1}'

# Expected: {"jsonrpc":"2.0","id":1,"result":["0x0000000071727De22E5E9d8BAf0edAc6f37da032"]}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BUNDLER_PRIVATE_KEY` | (required) | Private key for the bundler signer (0x prefixed) |
| `RPC_URL` | `https://rpc.ab.testnet.adifoundation.ai/` | ADI Testnet RPC |
| `ENTRYPOINT_ADDRESS` | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | EntryPoint v0.7 |
| `BUNDLER_PORT` | `4337` | Local port for the bundler |

## RPC Methods

The bundler exposes standard ERC-4337 bundler RPC methods:

- `eth_sendUserOperation` — Submit a UserOperation
- `eth_estimateUserOperationGas` — Estimate gas for a UserOperation
- `eth_getUserOperationReceipt` — Get receipt for a submitted UserOp
- `eth_getUserOperationByHash` — Get UserOp details by hash
- `eth_supportedEntryPoints` — List supported EntryPoint addresses
- `eth_chainId` — Return the chain ID

## Architecture

```
User Wallet
    |
    v
Frontend (builds UserOp, gets paymasterAndData from middleware)
    |
    v
Alto Bundler (localhost:4337)
    |  validates UserOp
    |  bundles with other UserOps
    |  submits to EntryPoint
    v
ADI Testnet (EntryPoint -> Paymaster -> Smart Account)
```

## Troubleshooting

**Build fails:**
- Ensure Node.js 20+ and pnpm are installed
- Run `pnpm install` again if dependencies are missing

**Bundler won't start:**
- Check that the private key has ADI tokens for gas
- Verify EntryPoint is deployed: `cast code 0x0000000071727De22E5E9d8BAf0edAc6f37da032 --rpc-url https://rpc.ab.testnet.adifoundation.ai/`

**UserOps rejected:**
- Check bundler logs for error details
- Verify paymaster has sufficient deposit at EntryPoint
- Ensure `--safe-mode false` is set (ADI testnet may not fully support ERC-7562 validation)

**Docker build slow:**
- First build clones and compiles Alto (~3-5 minutes)
- Subsequent starts use the cached image
