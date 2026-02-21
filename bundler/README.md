# Alto Bundler for ADI Testnet

Self-hosted [Pimlico Alto](https://github.com/pimlicolabs/alto) bundler for ERC-4337 Account Abstraction on ADI Testnet (Chain ID: 99999).

## Quick Start

```bash
# 1. Copy env template and set your bundler private key
cp .env.example .env
# Edit .env and set BUNDLER_PRIVATE_KEY

# 2. Fund the bundler signer address with native ADI tokens
# (The bundler needs ADI to submit bundles on-chain)

# 3. Start the bundler
docker compose up -d

# 4. Verify it's running
curl -s http://localhost:4337 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_supportedEntryPoints","params":[],"id":1}'
# Expected: {"jsonrpc":"2.0","id":1,"result":["0x0000000071727De22E5E9d8BAf0edAc6f37da032"]}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BUNDLER_PRIVATE_KEY` | (required) | Private key for the bundler signer |
| `RPC_URL` | `https://rpc.ab.testnet.adifoundation.ai/` | ADI Testnet RPC |
| `ENTRYPOINT_ADDRESS` | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | EntryPoint v0.7 |
| `BUNDLER_PORT` | `4337` | Local port for the bundler |
| `BUNDLE_INTERVAL` | `5` | Seconds between bundle submissions |
| `MAX_BUNDLE_SIZE` | `10` | Max UserOps per bundle |
| `LOG_LEVEL` | `info` | Logging verbosity |

## RPC Methods

The bundler exposes standard ERC-4337 bundler RPC methods:

- `eth_sendUserOperation` - Submit a UserOperation
- `eth_estimateUserOperationGas` - Estimate gas for a UserOperation
- `eth_getUserOperationReceipt` - Get receipt for a submitted UserOp
- `eth_getUserOperationByHash` - Get UserOp details by hash
- `eth_supportedEntryPoints` - List supported EntryPoint addresses
- `eth_chainId` - Return the chain ID

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

**Bundler won't start:**
- Ensure Docker is running
- Check that `BUNDLER_PRIVATE_KEY` is set in `.env`
- Verify the bundler signer has ADI tokens for gas

**UserOps rejected:**
- Check bundler logs: `docker compose logs -f`
- Ensure EntryPoint is deployed on ADI testnet
- Verify paymaster has sufficient deposit at EntryPoint

**Connection refused:**
- Check port mapping: `docker compose ps`
- Ensure no other service is using port 4337
