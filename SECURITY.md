# Security Assumptions and Supported Configurations

This document outlines the explicit design assumptions, supported configurations, and tested threat vectors for the `BeginnerChef` staking contract. By documenting these edges, we clarify what the contract is designed to protect against and where integrators must exercise caution.

## Tested Threat Vectors

The following threats have been explicitly tested in the contract's test suite to ensure the behavior matches our design assumptions.

### 1. Fee-on-Transfer Tokens
**Threat:** Tokens that charge a fee on transfer (e.g., burning a percentage of the amount transferred) cause a mismatch between the `amount` passed to `deposit()` and the actual balance the contract receives.
**Test Reference:** `test_FeeOnTransfer_MismatchedAccounting()` in `BeginnerChef.t.sol`
**Conclusion:** **Unsupported.** The test proves that using a fee-on-transfer token results in accounting drift. A user can deposit, get credited for the full amount, and later withdraw that full amount—stealing funds from other users in the pool. The contract assumes standard ERC-20 transfer semantics.

### 2. First-Depositor / Donation Attack
**Threat:** An attacker transfers tokens directly to the contract (bypassing `deposit()`) to artificially inflate the pool's token balance. In some vault architectures, this allows stealing from the next depositor.
**Test Reference:** `test_DonationAttack_DilutesRewards()` in `BeginnerChef.t.sol`
**Conclusion:** **Supported (No theft, but dilution occurs).** Because `BeginnerChef` tracks user principal individually rather than issuing shares, a donation cannot steal a user's principal. However, as the test demonstrates, because `updatePool()` uses `balanceOf(address(this))` to calculate the reward rate per token, a donation inflates the denominator. This safely prevents theft but effectively dilutes the reward rate for legitimate stakers. Unlike vault-style donation attacks, this contract's design prevents value theft via donation, but does not prevent reward-rate dilution.

### 3. Reentrancy via Malicious Token
**Threat:** A malicious ERC-20 token attempts to call back into `deposit()` or `withdraw()` during its `transferFrom` execution, potentially exploiting state changes that haven't finalized.
**Test Reference:** `test_Reentrancy_BlocksMaliciousToken()` in `BeginnerChef.t.sol`
**Conclusion:** **Protected.** The test deploys a `MockMalicious` token that attempts to reenter `deposit()`. The transaction successfully reverts, proving that the `nonReentrant` modifier on state-changing functions correctly blocks reentrancy attacks.

### 4. Rounding / Precision Dust at Small Stakes
**Threat:** A user deposits a tiny amount (e.g., 1 wei) into a pool with a massive total supply. Integer division in the reward calculation could either revert or wildly miscalculate rewards.
**Test Reference:** `test_RoundingPrecisionDust()` in `BeginnerChef.t.sol`
**Conclusion:** **Protected.** The test demonstrates that when a user stakes 1 wei alongside a 10,000,000 ether deposit, the contract's `1e12` scaling correctly handles the math without reverting. The tiny stake's reward safely rounds down to `0`, validating our scaling logic.

---

## Unsupported Configurations (Not Tested)

The following configurations are explicitly unsupported by design.

### 5. Staking Token == Reward Token
**Threat:** Configuring a pool where the staking token is the exact same address as the reward token being distributed.
**Conclusion:** **Unsupported.** If the staking token and reward token are identical, the contract's `balanceOf` check for the staking pool would include the unallocated reward reserves. This would massively inflate the perceived pool size, destroying the reward math and causing user stakes to be counted as part of the rewards pool (or vice versa).

### 6. Duplicate Staking Token Across Two Pools
**Threat:** The owner adds two separate pools (different PIDs) that use the same underlying staking token.
**Conclusion:** **Unsupported.** We decided not to enforce on-chain uniqueness (e.g., checking a mapping before adding a pool) to keep the code simpler and match the original MasterChef behavior. However, if this occurs, the `balanceOf(address(this))` call in `updatePool()` will count the total balance across *both* pools for *each* pool's reward calculation, effectively double-counting the balance and severely diluting rewards. Integrators and owners must ensure tokens are added only once.
