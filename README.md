# BeginnerChef — Multi-Pool Staking Contract

A MasterChef-style (SushiSwap-inspired) multi-pool staking platform, built from scratch in Solidity as an end-to-end demonstration of smart contract design, testing, and deployment.

**Live on Sepolia:** [`0x389F8290344516f2973E5E5f145537d6b7613086`](https://sepolia.etherscan.io/address/0x389F8290344516f2973E5E5f145537d6b7613086) — verified source

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Why MasterChef, Not Synthetix](#why-masterchef-not-synthetix)
- [Architecture](#architecture)
- [The Core Algorithm](#the-core-algorithm)
- [Key Design Decisions](#key-design-decisions)
- [Testing Strategy](#testing-strategy)
- [Security](#security)
- [Deployment](#deployment)
- [Local Development](#local-development)

---

## Project Structure

```
contracts/
├── src/
│   ├── BeginnerChef.sol          # Main staking contract
│   └── mocks/
│       ├── MockA.sol             # Mock reward token
│       ├── MockB.sol             # Mock staking token (pool 0)
│       ├── MockC.sol             # Mock staking token (pool 1)
│       ├── MockFeeOnTransfer.sol # Simulates a fee-on-transfer ERC20
│       └── MockMalicious.sol     # Simulates a reentrant ERC20
├── test/
│   ├── BeginnerChef.t.sol        # Unit, fuzz, and security tests
│   └── Invariant/
│       └── BeginnerChef.invariant.t.sol  # Handler-based invariant suite
├── script/
│   └── Deploy.s.sol              # Deployment + verification script
├── SECURITY.md                   # Full threat-by-threat security writeup
└── foundry.toml

frontend/
├── src/
│   ├── abi/                      # Contract ABIs
│   ├── components/               # React components (PoolCard, FaucetPage, HistoryPage)
│   ├── utils/                    # Utility functions (contracts.ts)
│   ├── App.tsx                   # Main application component
│   ├── index.css                 # Global styles
│   └── main.tsx                  # Application entry point
├── package.json
└── vite.config.ts
```

---

## Overview

BeginnerChef is a multi-pool staking contract that lets an owner create multiple staking pools — each with its own staking token and reward weight (`allocPoint`) — and distributes a single reward token to stakers proportionally, in real time, based on how much they've staked, for how long, and their pool's relative weight against all other pools.

It supports:
- **Multiple concurrent pools**, each with an independently configurable staking token and reward allocation
- **Proportional, time-weighted reward distribution** using the reward-debt accounting model
- **Dynamic reward rebalancing** — the owner can adjust a pool's weight after the fact without corrupting already-accrued rewards
- **A pre-funded reward model** — no mint privileges required on the staking contract
- **An emergency withdrawal escape hatch** independent of the main reward-calculation logic

---

## Why MasterChef, Not Synthetix

Two dominant patterns exist for on-chain staking rewards: Synthetix's `StakingRewards.sol` (reward-per-token accumulator) and SushiSwap's `MasterChef.sol` (reward-debt accounting). Both are mathematically equivalent in what they guarantee — proportional rewards based on stake size and duration — but differ in implementation and scope:

| | Synthetix `StakingRewards` | MasterChef (this project) |
|---|---|---|
| Pools | Single pool per contract | Multiple pools, one contract |
| Reward weighting | N/A (single pool) | `allocPoint`-weighted split across pools |
| Accounting model | Reward-per-token snapshot | Reward debt |
| Common use case | Single-asset staking (e.g., stake token X, earn token X or Y) | Yield farms, multi-asset reward programs |

This project deliberately implements the MasterChef pattern because multi-pool support is a meaningfully harder engineering problem — it requires correctly handling reward-weight rebalancing (`set()`) without retroactively corrupting already-accrued rewards in *other* pools, which has no equivalent in a single-pool design.

---

## Architecture

### Storage

```solidity
struct UserInfo {
    uint256 stakedAmount;
    uint256 rewardDebt;
}

struct PoolInfo {
    IERC20 stakingToken;
    uint256 allocPoint;
    uint256 lastRewardTime;
    uint256 accRewardPerToken;
}

PoolInfo[] public poolInfo;
mapping(uint256 => mapping(address => UserInfo)) public userInfo;
uint256 public totalAllocPoint;
IERC20 public rewardToken;
uint256 public rewardPerSecond;
```

- **`accRewardPerToken`** — an accumulator, scaled by `1e12` for precision, tracking cumulative rewards earned per staked token since the pool's inception.
- **`rewardDebt`** — the amount a user "would have earned" had they been staked since the pool began, used to offset the accumulator so a user is only credited for rewards accrued *after* they joined.
- **`allocPoint` / `totalAllocPoint`** — determines each pool's proportional share of the global `rewardPerSecond` emission.

### Design choices vs. the original MasterChef

| Feature | Original MasterChef | This project |
|---|---|---|
| Time basis | `block.number` | `block.timestamp` |
| Reward source | Minted on demand | Pre-funded, fixed supply |
| Pool uniqueness | Not enforced on-chain | Not enforced on-chain (documented assumption, see [Security](#security)) |

**Timestamp over block number:** block time varies across chains and over a chain's lifetime (e.g., post-Merge Ethereum's ~12s block time isn't guaranteed to stay fixed forever, and other EVM chains have very different block times). `block.timestamp`-based accounting is portable across chains and immune to block-time drift, at the cost of a small, economically irrelevant timestamp-manipulation window available to validators (a few seconds at most — negligible against reward periods measured in minutes/hours/days).

**Pre-funded over mint-on-demand:** the original MasterChef mints its reward token (SUSHI) on every `updatePool()` call because SushiSwap controls that token's supply. This contract has no such relationship with its reward token — granting a staking contract unrestricted mint rights on a reward asset is a significant trust assumption and attack surface (a compromised contract could mint unbounded rewards). Instead, the contract must be funded with a fixed reward token balance upfront, and can only ever pay out what it actually holds. This makes "total rewards paid out ≤ total rewards funded" a hard, testable invariant rather than an assumption (see [Testing Strategy](#testing-strategy)).

---

## The Core Algorithm

Every pool interaction (`deposit`, `withdraw`, `emergencyWithdraw`) follows the same sequence:

1. **`updatePool(pid)`** — bring the pool's `accRewardPerToken` up to date with the current timestamp, before any user-facing state changes.
2. **Harvest** — if the user already has a stake, calculate and pay out their pending reward using the *just-updated* accumulator.
3. **Mutate state** — apply the deposit/withdrawal to `stakedAmount`.
4. **Reset `rewardDebt`** — snapshot the user's reward debt against the new `stakedAmount` and current accumulator, so future calculations only credit them for time going forward.

This ordering exists specifically to prevent a **dilution bug**: if a new deposit were applied *before* the pool's accumulator was brought up to date, the new depositor would unfairly dilute rewards that had already been earned by existing stakers before they joined.

### Reward-weight rebalancing (`set()`)

Changing a pool's `allocPoint` mid-stream is where MasterChef's multi-pool design gets genuinely tricky. Both `add()` (new pool) and `set()` (reweight existing pool) call `massUpdatePools()` first — looping through every pool and calling `updatePool()` on each — to "lock in" every pool's accrued rewards at the *old* `totalAllocPoint` ratio before it changes. Skipping this step would let a reward-weight change retroactively apply to time that already elapsed under the old ratio, silently shortchanging or overpaying stakers. This is directly verified in the test suite (`test_Set_MidStream_DoesNotRetroactivelyChangeRewards`).

### The zero-total-staked edge case

If a pool has no stakers, `updatePool()` cannot divide reward accrual across a `totalStaked` of zero. Rather than reverting, the function fast-forwards `pool.lastRewardTime` to the current timestamp and returns early — rewards for any period with zero stakers are simply never accrued to anyone, rather than being retroactively credited to whoever deposits next. This is a deliberate design choice (matching the original MasterChef's behavior), tested explicitly in `test_Deposit_ZeroTotalStaked_NoRewardsLost`.

---

## Key Design Decisions

- **`view`-compatible `pendingRewards()`:** since view functions cannot call state-mutating functions, `pendingRewards()` duplicates `updatePool()`'s accumulator math into a local variable, giving users an accurate, real-time preview of unclaimed rewards without requiring an actual on-chain state update.
- **`emergencyWithdraw()` has no reward logic at all:** it exists as a minimal-surface-area escape hatch — if reward calculation logic were ever broken or the reward token had an issue, users can still always recover their staked principal. It deliberately forfeits pending rewards rather than trying to be "helpful" and risk being another point of failure.
- **Pool identity via `balanceOf`, not manual tracking:** `updatePool()` determines a pool's total staked amount via `stakingToken.balanceOf(address(this))` rather than a manually incremented counter. This is simpler and less error-prone, but comes with an explicit assumption — see [Security](#security).

---

## Testing Strategy

The test suite is layered, each layer catching a different class of bug:

### Unit tests (10 tests)
Hand-constructed scenarios verifying core correctness: single-staker full-duration rewards, proportional splitting between multiple stakers joining at different times, multi-pool `allocPoint` splitting, non-retroactive `set()` rebalancing, the zero-total-staked edge case, withdrawal bounds checking, and emergency withdrawal forfeiture.

### Fuzz tests (3 tests)
Property-based tests run against hundreds of randomized inputs per run:
- Deposit-then-immediately-withdraw always returns the exact amount staked
- `pendingRewards()` never exceeds the theoretical maximum possible for the elapsed time and reward rate
- Cross-pool reward ratios hold proportionally to `allocPoint` ratios, for arbitrary weight combinations

### Invariant tests
A handler-based invariant suite drives random sequences of `deposit`/`withdraw`/`add`/`set`/`emergencyWithdraw`/time-warp calls (128,000+ calls per run) and checks three properties hold regardless of call order:
- **Conservation** — total pending + already-paid rewards never exceeds total funded rewards
- **Accumulator monotonicity** — `accRewardPerToken` never decreases for any pool
- **Allocation correctness** — over periods with no `set()` calls, each pool's accrued reward share matches its `allocPoint` ratio within rounding tolerance


### Security-focused behavioral tests (4 tests)
Adversarial scenarios proven with dedicated mock tokens rather than just reasoned about:
- **Fee-on-transfer tokens** — demonstrated an actual fund-theft exploit path (see [Security](#security))
- **Donation attack** — proved no principal can be stolen via direct token donation, but confirmed real reward-rate dilution occurs
- **Reentrancy** — proved `nonReentrant` blocks a malicious token's reentrant callback
- **Rounding/precision dust** — proved a 1-wei stake against a multi-million-token pool safely rounds to zero rather than reverting or corrupting accounting

Run the full suite:
```bash
forge test -vv
```

---

## Security

Full writeup in [`SECURITY.md`](./SECURITY.md). Summary:

| Threat | Status | Verified by |
|---|---|---|
| Fee-on-transfer / deflationary staking tokens | **Unsupported** — causes real fund theft between users | `test_FeeOnTransfer_MismatchedAccounting` |
| First-depositor / donation attack | **Safe from theft, but dilutes rewards** | `test_DonationAttack_DilutesRewards` |
| Reentrancy via malicious token | **Protected** | `test_Reentrancy_BlocksMaliciousToken` |
| Rounding/precision dust at small stakes | **Safe** — rounds to zero, never reverts | `test_RoundingPrecisionDust` |
| Staking token == reward token | **Unsupported** (documented, not enforced) | Documented assumption |
| Duplicate staking token across pools | **Unsupported** (documented, not enforced) | Documented assumption |

Standard protections in place throughout: `ReentrancyGuard` on all state-changing external functions, `SafeERC20` for all token transfers (guards against non-reverting failed transfers), `Ownable` access control on pool-management functions, and checks-effects-interactions ordering on every function that combines state mutation with an external call.

---

## Deployment

Deployed and verified on **Sepolia testnet**.

| Contract | Address |
|---|---|
| BeginnerChef | [`0xb2027252C51202E66e439a5f0538372172782817`](https://sepolia.etherscan.io/address/0xb2027252c51202e66e439a5f0538372172782817) |
| Reward Token (RWD) | [`0x970F5109F3708B97671625711ea77615Ece1A201`](https://sepolia.etherscan.io/address/0x970f5109f3708b97671625711ea77615ece1a201) |
| Staked Token 1 (STK1) | [`0x2ed8172042715d38edc27C59163c907b1215a942`](https://sepolia.etherscan.io/address/0x2ed8172042715d38edc27c59163c907b1215a942) |
| Staked Token 2 (STK2) | [`0x4d1a510F1d755abE659D75eeFf2ed6D1ae73bDe8`](https://sepolia.etherscan.io/address/0x4d1a510f1d755abe659d75eeff2ed6d1ae73bde8) |

**Pools:**
- Pool 0: Staked Token 1, `allocPoint = 100` (~66.7% of rewards)
- Pool 1: Staked Token 2, `allocPoint = 50` (~33.3% of rewards)

Deployed and verified via a single Foundry script (`script/Deploy.s.sol`) that deploys all four contracts, pre-funds the staking contract with 1,000,000 reward tokens, registers both pools, and mints demo staking tokens to the deployer — reproducible end-to-end with:

```bash
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## Local Development

```bash
# Install dependencies
forge install

# Run the full test suite
forge test -vv

# Run just the invariant suite
forge test --match-path test/Invariant/BeginnerChef.invariant.t.sol -vv

# Deploy locally against Anvil
anvil                                            # separate terminal
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy to Sepolia (requires .env with PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY)
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

**Stack:** Foundry, Solidity `^0.8.20` (compiled with `0.8.30`), OpenZeppelin Contracts v5 (`Ownable`, `SafeERC20`, `ReentrancyGuard`).
