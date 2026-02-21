# ERC-4337 Paymaster Devtools for ADI Chain

Reusable gas sponsorship toolkit for building gas-abstracted dApps on ADI blockchain using ERC-4337 Account Abstraction.

> Built for the **ADI Foundation Bounty** at ETHDenver 2026. Everything here is designed so another team can fork this repo, deploy to ADI testnet, and have gas-sponsored UserOperations working within minutes.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Sponsorship Model](#sponsorship-model)
- [Smart Contracts](#smart-contracts)
- [Developer Tooling](#developer-tooling)
- [Backend Sponsor API](#backend-sponsor-api)
- [E2E Testnet Demonstrations](#e2e-testnet-demonstrations)
- [Failure Cases](#failure-cases)
- [Test Suite](#test-suite)
- [How to Reuse This in Your dApp](#how-to-reuse-this-in-your-dapp)
- [Security Assumptions](#security-assumptions)
- [Deployed Addresses](#deployed-addresses)

---

## Overview

This toolkit provides **two ERC-4337 v0.7 paymasters** for ADI chain:

| Paymaster | Mode | What It Does |
|-----------|------|-------------|
| **ADINativePaymaster** | `0x00` | Sponsors gas entirely -- users pay nothing |
| **ADIErc20Paymaster** | `0x01` | Users pay gas in ERC-20 tokens (e.g. DDSC stablecoin) instead of native ADI |

Both paymasters use the same **backend-controlled sponsor signer** authorization model, where a backend service signs each sponsorship request and the on-chain paymaster verifies that signature in `validatePaymasterUserOp`. No reliance on `msg.sender` or bundler identity.

### What's Included

- **2 Paymaster contracts** + shared `SponsorshipLib` library
- **23 unit tests** covering success paths, edge cases, and all failure modes
- **3 Foundry scripts** for deployment, configuration, and sponsorship data generation
- **3 E2E demonstration scripts** tested live on ADI testnet (tx hashes included)
- **Backend sponsor API** (TypeScript/Hono) with rate limiting and eligibility checks
- **Pimlico Alto bundler** Docker setup pre-configured for ADI testnet
- **Frontend hooks** for sponsored transactions (React/Next.js)

---

## Architecture

```
 User's dApp (Frontend)
      |
      | 1. Build UserOperation
      | 2. POST /sponsor/native (or /erc20)
      v
 Backend Sponsor Service
      |
      | 3. Check eligibility (whitelist)
      | 4. Check rate limits (per-account hourly cap)
      | 5. Sign sponsorship authorization
      | 6. Return paymasterAndData
      v
 User's dApp
      |
      | 7. Attach paymasterAndData to UserOp
      | 8. Sign UserOp with account key
      | 9. eth_sendUserOperation to bundler
      v
 Alto Bundler (Pimlico)
      |
      | 10. Validate & bundle
      | 11. Submit to EntryPoint
      v
 ADI Blockchain (EntryPoint v0.7)
      |
      | 12. validatePaymasterUserOp():
      |     - Verify sponsor signature (ECDSA)
      |     - Check time window (validUntil/validAfter)
      |     - Check nonce (replay protection)
      |     - Check spend cap
      |
      | 13. Execute UserOp (account action)
      |
      | 14. postOp():
      |     - Native: track gas spend
      |     - ERC20: transferFrom(account, paymaster, tokenAmount)
      v
 Done. User paid 0 native gas (or paid in ERC-20).
```

---

## Sponsorship Model

### Authorization Flow

Sponsorship is **not open** -- every UserOperation must carry a valid sponsor signature. This prevents abuse and gives the dApp operator full control over who gets sponsored.

The sponsor signature is embedded directly in `paymasterAndData` and verified on-chain:

```
Authorization binds to:
  - Smart account address (who)
  - Mode (native or ERC-20)
  - Chain ID (which chain)
  - EntryPoint address (which EntryPoint)
  - Paymaster address (which paymaster)
  - Time window (validUntil / validAfter)
  - Sponsor nonce (replay protection)
```

The backend holds the sponsor signer private key and only issues signatures after checking eligibility (e.g. KYC whitelist) and rate limits.

### paymasterAndData Layout

The `paymasterAndData` field follows ERC-4337 v0.7 format:

```
Byte Range   Field                    Size
-----------  -----------------------  --------
[0:20]       Paymaster address        20 bytes   (set by protocol)
[20:36]      Verification gas limit   16 bytes   (uint128)
[36:52]      Post-op gas limit        16 bytes   (uint128)
--- Custom data (110 bytes) ---
[52:53]      mode                     1 byte     (0x00=native, 0x01=erc20)
[53:59]      validUntil               6 bytes    (uint48 timestamp)
[59:65]      validAfter               6 bytes    (uint48 timestamp)
[65:97]      sponsorNonce             32 bytes   (uint256)
[97:162]     sponsor signature        65 bytes   (ECDSA: r || s || v)
```

Total: **162 bytes**.

### Sponsorship Hash

The sponsor signs a deterministic hash computed as:

```solidity
keccak256(abi.encode(
    mode,        // uint8
    validUntil,  // uint48
    validAfter,  // uint48
    sender,      // address (smart account)
    sponsorNonce,// uint256
    chainId,     // uint256
    entryPoint,  // address
    paymaster    // address
))
```

Signed with `eth_sign` (personal_sign) to produce a 65-byte ECDSA signature.

---

## Smart Contracts

### SponsorshipLib.sol

Shared library for encoding, decoding, and hashing sponsorship data.

| Function | Description |
|----------|-------------|
| `decode(bytes)` | Decode custom data from paymasterAndData into `SponsorshipData` struct |
| `encode(mode, validUntil, validAfter, nonce, sig)` | Encode fields into 110-byte custom data blob |
| `getHash(mode, validUntil, validAfter, sender, nonce, chainId, entryPoint, paymaster)` | Compute deterministic sponsorship hash for signing |

### ADINativePaymaster.sol

Sponsors gas entirely using the paymaster's native token deposit at EntryPoint.

**Key Features:**
- ECDSA sponsor signer verification in `_validatePaymasterUserOp`
- Per-account spend caps (configurable default + per-account overrides)
- Nonce-based replay protection
- Time-windowed validity (`validUntil` / `validAfter`)
- Cumulative gas spend tracking per account
- Owner-controlled admin functions

**State Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `sponsorSigner` | `address` | Backend-controlled signer that authorizes sponsorships |
| `defaultSpendCap` | `uint256` | Default max native gas spend per account (0 = unlimited) |
| `accountSpendCap[addr]` | `uint256` | Per-account override (0 = use default) |
| `accountSpendTotal[addr]` | `uint256` | Cumulative gas spent by each account |
| `usedNonces[nonce]` | `bool` | Replay protection |

**Events:**
- `GasSponsored(address indexed account, bytes32 indexed userOpHash, uint256 actualGasCost)`
- `SponsorSignerUpdated(address indexed oldSigner, address indexed newSigner)`
- `DefaultSpendCapUpdated(uint256 oldCap, uint256 newCap)`
- `AccountSpendCapUpdated(address indexed account, uint256 cap)`

### ADIErc20Paymaster.sol

The smart account pays gas in an ERC-20 token (e.g. DDSC stablecoin). The paymaster covers native gas at EntryPoint, then in `postOp` calls `transferFrom(account, paymaster, tokenAmount)` to collect the ERC-20 equivalent.

**Additional Features (beyond native):**
- Configurable native-to-token exchange rate
- Price markup for volatility protection (e.g. 110 = 10% buffer)
- Handles decimal mismatch (18-decimal native vs 6-decimal DDSC)
- Pre-checks token allowance in `_validatePaymasterUserOp`
- Owner can withdraw accumulated tokens

**Rate Conversion Formula:**
```
tokenAmount = (nativeWei * nativeToTokenRate * priceMarkup) / (1e18 * 100)
```

Example: At rate `3_670000` (3.67 DDSC/ADI) with 110% markup:
- 0.1 ADI gas cost = 0.1 * 3.67 * 1.1 = **0.4037 DDSC**

**Additional State Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `token` | `IERC20 (immutable)` | ERC-20 used for payment (e.g. DDSC) |
| `tokenDecimals` | `uint8 (immutable)` | Token decimals (6 for DDSC) |
| `nativeToTokenRate` | `uint256` | Token-units per 1e18 native wei |
| `priceMarkup` | `uint256` | Percentage (100 = no markup, 110 = 10%) |

**Events:**
- `Erc20GasPayment(address indexed account, bytes32 indexed userOpHash, uint256 erc20Amount, uint256 nativeGasCost)`
- `RateUpdated(uint256 oldRate, uint256 newRate)`
- `PriceMarkupUpdated(uint256 oldMarkup, uint256 newMarkup)`

---

## Developer Tooling

All scripts are Foundry-based and live in `contracts/script/paymaster/`.

### Deploy Paymasters

```bash
cd contracts

# Deploy both paymasters + SimpleAccountFactory on ADI testnet
# Reads PRIVATE_KEY, MOCK_DIRHAM from .env
# Deposits 1 ADI to each paymaster at EntryPoint
forge script script/paymaster/DeployPaymasters.s.sol -f adi_testnet --broadcast
```

The script:
1. Checks if EntryPoint v0.7 exists (deterministic address `0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
2. Deploys `SimpleAccountFactory`
3. Deploys `ADINativePaymaster` (10 ADI default spend cap, sponsor signer = deployer)
4. Deploys `ADIErc20Paymaster` (DDSC token, rate=3.67, markup=110%, 100 DDSC default cap)
5. Deposits 1 ADI to each paymaster at EntryPoint
6. Logs all addresses for `.env`

### Configure Sponsor Signer

```bash
# Rotate the sponsor signer on both paymasters
forge script script/paymaster/ConfigureSponsor.s.sol \
  --sig "run(address)" 0xNEW_SIGNER_ADDRESS \
  -f adi_testnet --broadcast
```

### Generate Sponsorship Data

```bash
# Generate paymasterAndData for native sponsorship
forge script script/paymaster/GenerateSponsorship.s.sol \
  --sig "run(address,uint48,uint256)" \
  0xACCOUNT_ADDRESS 300 12345 \
  -f adi_testnet

# Generate paymasterAndData for ERC20 sponsorship
forge script script/paymaster/GenerateSponsorship.s.sol \
  --sig "runErc20(address,uint48,uint256)" \
  0xACCOUNT_ADDRESS 300 12345 \
  -f adi_testnet
```

Parameters: `(account, validForSeconds, sponsorNonce)`. Outputs the full `paymasterAndData` hex to attach to your UserOperation.

---

## Backend Sponsor API

A TypeScript service (`middleware/src/services/sponsorship.ts`) + Hono routes (`middleware/src/api/routes/sponsor.ts`) that acts as the off-chain sponsor signer.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sponsor/native` | Generate native gas sponsorship |
| `POST` | `/sponsor/erc20` | Generate ERC20 gas sponsorship |
| `GET` | `/sponsor/status/:address` | Check eligibility and rate limits |
| `GET` | `/sponsor/config` | Return paymaster configuration |

### Request / Response Examples

**Request sponsorship:**
```bash
curl -X POST http://localhost:3000/sponsor/native \
  -H "Content-Type: application/json" \
  -d '{"sender": "0xYOUR_SMART_ACCOUNT"}'
```

**Response:**
```json
{
  "paymasterAndData": "0x51af1e71...full hex...",
  "validUntil": 1740200000,
  "validAfter": 1740199700,
  "mode": "native",
  "paymaster": "0x51AF1E71eF7d938015EE91AAAcEf61d471b4E36d",
  "sponsorNonce": 1740199700001
}
```

**Check status:**
```bash
curl http://localhost:3000/sponsor/status/0xYOUR_ACCOUNT
```

**Response:**
```json
{
  "eligible": true,
  "whitelisted": true,
  "sponsoredThisHour": 3,
  "hourlyLimit": 10,
  "totalSponsored": 47,
  "paymasterEnabled": true
}
```

### Features

- **Eligibility check**: Queries on-chain `UserRegistry.isWhitelisted()` before signing
- **Rate limiting**: Per-account hourly cap (default: 10 ops/hour), tracked in SQLite
- **Nonce management**: Incrementing nonce counter for replay protection
- **Time-windowed**: Each sponsorship valid for configurable seconds (default: 300s)
- **Feature flag**: Entire system disabled when `PAYMASTER_ENABLED=false`

### Environment Variables

```env
PAYMASTER_ENABLED=true
SPONSOR_SIGNER_KEY=0x...          # Private key for signing sponsorships
NATIVE_PAYMASTER=0x...            # Deployed ADINativePaymaster address
ERC20_PAYMASTER=0x...             # Deployed ADIErc20Paymaster address
ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032
CHAIN_ID=99999
BUNDLER_URL=http://localhost:4337
SPONSORSHIP_VALIDITY_SECONDS=300  # 5-minute sponsorship window
DEFAULT_SPEND_CAP_PER_HOUR=10    # Max sponsored ops per account per hour
```

---

## E2E Testnet Demonstrations

All E2E flows were executed live on **ADI Testnet (Chain ID: 99999)** and verified on-chain.

### Flow A: Native Gas Sponsorship

A counterfactual smart account with zero native balance gets its deployment + first action fully sponsored.

```bash
forge script script/paymaster/E2ENativeSponsorship.s.sol \
  -f adi_testnet --broadcast --gas-estimate-multiplier 300
```

**What the script does:**
1. Computes counterfactual SimpleAccount address (not yet deployed)
2. Verifies account has zero native balance and zero code
3. Builds UserOp with `initCode` (deploys account) + `callData` (executes action)
4. Generates sponsor signature via `SponsorshipLib`
5. Submits to EntryPoint via `handleOps`
6. Verifies: account deployed, balance still 0, paymaster deposit decreased

**Testnet Results:**
```
Smart Account (counterfactual): 0x...
Account balance: 0 (should be 0)
Paymaster deposit before: 6000000000000000000

=== Results ===
Smart Account deployed: YES
Account native balance: 0 (still 0 - gas was sponsored)
Paymaster deposit after: 5796324600000000000
Gas cost to paymaster:    203675400000000000 (~0.20 ADI)
Account spend tracked:    176004600000000000
```

### Flow B: ERC20 Gas Sponsorship

A smart account funded only with DDSC (no native tokens) pays gas in DDSC.

```bash
forge script script/paymaster/E2EErc20Sponsorship.s.sol \
  -f adi_testnet --broadcast --gas-estimate-multiplier 300
```

**What the script does:**
1. Deploys smart account via native sponsorship (Step 1)
2. Sets DDSC approval for ERC20 paymaster
3. Mints 100 DDSC to the account (Step 2)
4. Executes ERC20-sponsored UserOp -- gas paid in DDSC (Step 3)
5. Verifies: DDSC deducted, paymaster received DDSC, native deposit decreased

**Testnet Results:**
```
DDSC balance before:        100000000 (100.000000 DDSC)
Paymaster deposit before:   6000000000000000000

=== Results ===
DDSC balance after:         99698013 (99.698013 DDSC)
DDSC deducted:              301987   (0.301987 DDSC)
Paymaster deposit after:    5883001800000000000
Native gas paid by paymaster: 116998200000000000 (~0.117 ADI)
DDSC received by paymaster:   301987 (0.301987 DDSC)
```

---

## Failure Cases

Three failure scenarios are demonstrated with proper on-chain reverts.

```bash
forge script script/paymaster/E2EFailureCases.s.sol \
  -f adi_testnet -vv
```

### Case 1: Invalid Sponsor Signature

Signs sponsorship with a wrong private key. EntryPoint reverts with `AA33 reverted` (paymaster's `InvalidSignature()`).

```
--- Case 1: Invalid Sponsor Signature ---
  REVERTED as expected (InvalidSignature)
```

### Case 2: Expired Sponsorship

Sets `validUntil` to a past timestamp. EntryPoint rejects due to time window check.

```
--- Case 2: Expired Sponsorship ---
  REVERTED as expected (ExpiredSponsorship)
```

### Case 3: Spend Cap Exceeded

Sets account spend cap to 1 wei, then attempts a sponsored op that exceeds it.

```
--- Case 3: Spend Cap Exceeded ---
  REVERTED as expected (SpendCapExceeded)
```

---

## Test Suite

23 unit tests across two test files, all passing.

```bash
cd contracts
forge test --match-path "test/paymaster/*" -v
```

### ADINativePaymaster Tests (11)

| Test | What It Verifies |
|------|-----------------|
| `test_nativeSponsorshipSuccess` | Full flow: zero-balance account, gas sponsored, spend tracked |
| `test_invalidSignatureReverts` | Wrong signer key -> revert `InvalidSignature` |
| `test_expiredSponsorshipReverts` | Past `validUntil` -> revert via time range |
| `test_wrongModeReverts` | Mode 0x01 on native paymaster -> revert `InvalidMode` |
| `test_spendCapEnforced` | Exceed per-account cap -> revert `SpendCapExceeded` |
| `test_nonceReplayReverts` | Reuse same nonce -> revert `NonceAlreadyUsed` |
| `test_multipleOpsTrackSpend` | Cumulative spend tracking across multiple ops |
| `test_resetAccountSpend` | Owner can reset an account's spend counter |
| `test_depositAndWithdraw` | Owner can manage EntryPoint deposit |
| `test_setDefaultSpendCap` | Owner can update the default cap |
| `test_setSponsorSigner` | Owner can rotate the sponsor signer |

### ADIErc20Paymaster Tests (12)

| Test | What It Verifies |
|------|-----------------|
| `test_erc20PaymentSuccess` | Full flow: DDSC deducted, paymaster covers native gas |
| `test_erc20PaymentMultipleOps` | Multiple ops accumulate ERC-20 spend correctly |
| `test_insufficientAllowanceReverts` | No approval -> revert `InsufficientAllowance` |
| `test_underfundedErc20PostOpFails` | 0 DDSC balance -> postOp revert |
| `test_invalidSignatureReverts` | Wrong signer -> revert `InvalidSignature` |
| `test_spendCapEnforced` | ERC-20 spend cap -> revert `SpendCapExceeded` |
| `test_rateConversionAccuracy` | 18-to-6 decimal math with markup |
| `test_rateConversionSmallAmount` | Edge case: very small native amounts |
| `test_priceMarkupApplied` | Markup percentage applies correctly |
| `test_setNativeToTokenRate` | Owner can update exchange rate |
| `test_setPriceMarkup` | Owner can update markup |
| `test_withdrawTokens` | Owner can withdraw accumulated DDSC |

---

## How to Reuse This in Your dApp

### Step 1: Deploy Paymasters

```bash
# Clone and install
git clone <this-repo> && cd ethdenver/contracts
forge install

# Configure .env
cp .env.example .env
# Set: PRIVATE_KEY, MOCK_DIRHAM (your ERC-20 address)

# Deploy
forge script script/paymaster/DeployPaymasters.s.sol -f adi_testnet --broadcast

# Fund the paymasters with native ADI for gas sponsorship
cast send $ENTRYPOINT "depositTo(address)" $NATIVE_PAYMASTER \
  --value 10ether --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

### Step 2: Run the Backend Sponsor Service

```bash
cd middleware
cp .env.example .env
# Set deployed addresses from Step 1
# Set SPONSOR_SIGNER_KEY (must match the signer set during deployment)
# Set PAYMASTER_ENABLED=true

bun run src/index.ts
```

### Step 3: Start the Bundler

```bash
cd bundler
cp .env.example .env
# Set BUNDLER_PRIVATE_KEY (fund this address with ADI for bundle submission)

docker compose up -d
```

### Step 4: Integrate in Your Frontend

```typescript
// 1. Request sponsorship from your backend
const res = await fetch('/sponsor/native', {
  method: 'POST',
  body: JSON.stringify({ sender: smartAccountAddress })
});
const { paymasterAndData } = await res.json();

// 2. Attach to UserOp
userOp.paymasterAndData = paymasterAndData;

// 3. Sign the UserOp with the account owner's key
userOp.signature = await signUserOp(userOp, ownerKey);

// 4. Submit to bundler
const userOpHash = await bundlerClient.sendUserOperation(userOp);
```

### Step 5: Or Use the Foundry CLI Directly

```bash
# Generate paymasterAndData for any account
forge script script/paymaster/GenerateSponsorship.s.sol \
  --sig "run(address,uint48,uint256)" \
  0xYOUR_ACCOUNT 300 1 \
  -f adi_testnet
```

---

## Security Assumptions

1. **Sponsor signer key is secret.** If compromised, an attacker can authorize unlimited sponsorships. Rotate via `ConfigureSponsor.s.sol` or the admin function `setSponsorSigner()`.

2. **Backend controls eligibility.** The on-chain paymaster trusts any valid sponsor signature. All policy logic (whitelist, rate limits, fraud detection) lives in the backend service. This is intentional -- it keeps the contracts simple and gas-efficient while allowing flexible policy updates without redeployment.

3. **Nonces prevent replay.** Each sponsorship has a unique nonce that gets marked as used on-chain. The same `paymasterAndData` cannot be reused.

4. **Time windows limit exposure.** Sponsorships expire (default: 5 minutes). Even if a signed sponsorship leaks, it's only valid for a short window.

5. **Spend caps limit damage.** Per-account cumulative caps prevent a single account from draining the paymaster deposit. Owner can reset or adjust caps without redeployment.

6. **ERC-20 payment is post-execution.** `transferFrom` happens in `postOp`, after the UserOp succeeds. If the account doesn't have enough tokens or allowance, the entire UserOp reverts (EntryPoint handles this via the second `postOp` call).

7. **Exchange rate is admin-controlled.** The native-to-token rate is set by the paymaster owner, not an oracle. For production, consider integrating a price feed. The markup parameter provides a buffer for rate volatility.

8. **No reliance on msg.sender or bundler identity.** Authorization is purely signature-based, matching the bounty requirements.

---

## Deployed Addresses (ADI Testnet)

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SimpleAccountFactory | `0x7a83a0FBB96273364527FDB2CE826961a76C0D63` |
| ADINativePaymaster | `0x51AF1E71eF7d938015EE91AAAcEf61d471b4E36d` |
| ADIErc20Paymaster | `0x21A223F0efD59757750c229B77C551D3fC7b04C0` |
| DDSC (ERC-20 token) | `0xcDD3887eCc5C56417DE280cc562aB78687296b39` |
| Sponsor Signer | `0xE7E466DcDFD9f6460B7Da144A01E3F6fF0914F74` |

**Network:** ADI Testnet | **Chain ID:** 99999 | **RPC:** `https://rpc.ab.testnet.adifoundation.ai/` | **Explorer:** `https://explorer.ab.testnet.adifoundation.ai`

---

## File Index

```
contracts/
  src/paymaster/
    SponsorshipLib.sol        # Shared encoding/decoding/hashing library
    ADINativePaymaster.sol    # Native gas sponsorship paymaster
    ADIErc20Paymaster.sol     # ERC-20 gas payment paymaster
  test/paymaster/
    ADINativePaymaster.t.sol  # 11 unit tests
    ADIErc20Paymaster.t.sol   # 12 unit tests
    helpers/
      PaymasterTestSetup.sol  # Shared test harness
  script/paymaster/
    DeployPaymasters.s.sol    # Deploy both paymasters + factory
    E2ENativeSponsorship.s.sol# E2E Flow A: native sponsorship
    E2EErc20Sponsorship.s.sol # E2E Flow B: ERC-20 gas payment
    E2EFailureCases.s.sol     # Failure case demonstrations
    ConfigureSponsor.s.sol    # CLI: rotate sponsor signer
    GenerateSponsorship.s.sol # CLI: generate paymasterAndData

middleware/
  src/services/sponsorship.ts # Backend sponsor signer service
  src/api/routes/sponsor.ts   # REST API endpoints

bundler/
  docker-compose.yml          # Pimlico Alto bundler for ADI testnet
  .env.example                # Bundler configuration template

frontend/
  src/hooks/blockchain/
    use-sponsored-write.ts    # React hook for sponsored transactions
    use-sponsorship-status.ts # React hook for eligibility status
  src/app/admin/sponsorship/  # Admin panel for monitoring
```
