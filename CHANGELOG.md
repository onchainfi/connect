# Changelog

All notable changes to this project will be documented in this file.

## [3.3.0] - 2025-11-22

### 🔒 Security Enhancement - Payment ID Linking

This release implements mandatory payment ID linking between verification and settlement to prevent security exploits and ensure 100% certainty that verification occurs before settlement.

### 🛡️ Security Changes

#### Payment ID Flow
- **`verifyPayment()`** now returns `paymentId` from API response
- **`settlePayment()`** now requires `paymentId` as mandatory parameter
- Payment state now tracks `paymentId` for settlement
- Added validation checks for missing payment IDs

#### API Changes
- Updated `SettlePaymentParams` interface to include required `paymentId` field
- Settlement requests now send `paymentId` to API for exact payment matching
- Both `useEvmPay()` and `useSolanaPay()` hooks updated with new flow

### 🐛 Bug Fixes

#### Critical: Prevent Settlement Without Verification
- **Issue:** API could settle payments without proper verification linkage
- **Solution:** Mandatory `paymentId` ensures exact payment match
- **Impact:** Prevents double-settlement, cross-merchant exploits, and race conditions

### 🔄 Enhanced Features

#### `useEvmPay()` Hook
- Captures `paymentId` from verify response
- Validates `paymentId` exists before settlement
- Passes `paymentId` to settlement API
- Returns `paymentId` in verify result for external use

#### `useSolanaPay()` Hook
- Captures `paymentId` from verify response
- Validates `paymentId` exists before settlement
- Passes `paymentId` to settlement API
- Returns `paymentId` in verify result for external use

#### `PaymentState` Interface
- Added `paymentId?: string` field to track payment ID between verify and settle

### ✨ Benefits

#### Security
- **Prevents double settlement:** Status check on exact payment ID
- **Prevents cross-merchant exploits:** Ownership validation before settlement
- **Prevents race conditions:** Atomic matching via unique payment ID
- **Ensures verification first:** Cannot settle without valid payment ID from verify

#### Reliability
- Exact payment matching (no fuzzy searches)
- Clear error messages when payment ID missing
- Better debugging with payment ID tracking

### 🎯 API Contract

**New Verify Response:**
```typescript
{
  valid: true,
  paymentId: "cm3x4y5z6...",  // ← NEW: Required for settlement
  facilitator: "PayAI",
  txHash: "0x..."
}
```

**New Settle Request:**
```typescript
{
  paymentId: "cm3x4y5z6...",  // ← NEW: Required field
  paymentHeader: "...",
  sourceNetwork: "base",
  destinationNetwork: "base"
}
```

### 📦 Package Updates
- Version bumped from 3.2.1 to 3.3.0
- Fully backwards compatible with API v1 (but requires updated backend)
- Works with backend commit `731a3be` or later

### 🚀 Migration

**Automatic** - No code changes needed if using `useOnchainPay()`:
```tsx
// This still works identically - payment ID handled automatically
const { pay } = useOnchainPay();
await pay({ to: '0x...', amount: '0.10' });
```

**Manual verify/settle** users (if any):
```tsx
// Before (no longer works with new API):
const verifyResult = await verify({ to, amount });
await settle();

// After (payment ID automatically captured and used):
const verifyResult = await verify({ to, amount });
// verifyResult.paymentId is now available
await settle();  // Uses captured paymentId from state
```

### ⚠️ Breaking Changes

**Backend Compatibility:** Requires backend API v1 with payment ID support (commit `731a3be` or later). Older backends will reject settlement requests due to missing `paymentId` field.

### 🔗 Related

- Backend PR: Commit `731a3be` - "Require payment ID linking between verify and settle"
- See backend CHANGELOG for server-side security improvements

---

## [3.0.0] - 2025-11-16

### 🎉 Major Architectural Refactor - Separate EVM and Solana Hooks

This release completely refactors the payment hook architecture to cleanly separate EVM and Solana implementations, eliminating the "chainId mismatch viem" error and setting the foundation for scalable multi-chain support.

### 🏗️ Architecture Changes

#### Hook Separation
- **`useEvmPay()`** - New EVM-specific hook (Base, Optimism, Arbitrum, etc.)
  - Uses wagmi/viem exclusively
  - EIP-712 signing
  - No Solana dependencies loaded
- **`useSolanaPay()`** - New Solana-specific hook
  - Uses Solana wallet adapters exclusively
  - Solana transaction construction
  - No wagmi/viem dependencies loaded
- **`useOnchainPay()`** - Smart router
  - Delegates to appropriate implementation based on `chainType`
  - **100% backwards compatible** - Same API, same behavior
  - Both hooks called unconditionally (React rules), but only relevant one active

#### Shared Utilities
- **`hooks/shared/api.ts`** - Shared API functions
  - `verifyPayment()`, `settlePayment()`
  - `prepareBridge()` for cross-chain
  - `getRankedFacilitators()` for Solana
- **`hooks/shared/validation.ts`** - Shared validation
  - `validateAmount()`, `validateAddress()`
  - `generateNonce()`, `getValidityTimestamps()`

### 🐛 Bug Fixes

#### Critical: Viem ChainId Error
- **Issue:** "json is not a valid chainId object. details: chainId mismatch viem"
- **Root Cause:** wagmi's `useChainId()` hook running for Solana users with no valid EVM chain
- **Solution:** Separate hooks ensure wagmi hooks only run when EVM wallet is active
- **Impact:** Solana payments now work without EVM chain errors

### ✨ Benefits

#### Code Organization
- **Before:** 867-line monolithic `useOnchainPay.ts`
- **After:** Clean separation across 6 files
  - `useOnchainPay.ts` - 70 lines (router only)
  - `useEvmPay.ts` - 368 lines (EVM logic)
  - `useSolanaPay.ts` - 606 lines (Solana logic)
  - `shared/api.ts` - 160 lines (shared API)
  - `shared/validation.ts` - 45 lines (shared utils)

#### Maintainability
- Each hook focuses on single responsibility
- Easier to debug (clear error scoping)
- Easier to test (isolated logic)
- Easier to extend (add new chains without touching existing code)

#### Performance
- Only relevant chain libraries loaded during execution
- No cross-contamination between EVM and Solana state
- Cleaner stack traces
- Better error messages

#### Scalability
- Adding new chains (Bitcoin, Cosmos, etc.) follows clean pattern
- Each chain gets its own specialized hook
- Router delegates to appropriate implementation
- No risk of one chain affecting another

### 🔄 API Stability

**100% Backwards Compatible** - No breaking changes:

```tsx
// Existing code works identically
const { pay, verify, settle } = useOnchainPay();
await pay({ to: '0x...', amount: '0.10' });
```

### 📦 New Exports

Optional specialized hooks for advanced use cases:

```tsx
import { useEvmPay, useSolanaPay } from '@onchainfi/connect';

// Force EVM payment flow
const evmPay = useEvmPay();

// Force Solana payment flow
const solanaPay = useSolanaPay();
```

### 🚀 Migration Guide

**No migration needed** - Existing code continues to work without changes.

For those who want to use specialized hooks directly:
- Replace `useOnchainPay()` with `useEvmPay()` for EVM-only apps
- Replace `useOnchainPay()` with `useSolanaPay()` for Solana-only apps
- Keep `useOnchainPay()` for multi-chain support (recommended)

### 🎯 Future-Proofing

This architecture enables:
- Easy addition of new chains (Bitcoin, Cosmos, NEAR, etc.)
- Chain-specific optimizations without affecting others
- Independent testing and versioning per chain
- Clearer error messages and debugging

### 📝 Version Jump Rationale

**2.5.0 → 3.0.0** (Major version bump)

While the changes are 100% backwards compatible in API, this is a major architectural refactor that:
- Restructures internal implementation significantly
- Splits monolithic hook into modular architecture
- Changes how dependencies are loaded at runtime
- Sets foundation for future multi-chain expansion

Developers using the package see no breaking changes, but the internal architecture is fundamentally different.

---

## [2.5.0] - 2025-11-15

### ✨ New Features

#### Dynamic Solana Facilitator Selection
- **Smart routing** for Solana payments based on real-time rankings
- Calls `/v1/facilitators/ranked` API to select optimal facilitator
- Respects priority parameter (speed, cost, reliability, balanced)
- Supports multiple Solana facilitators: PayAI, Anyspend, OctonetAI, Aurracloud

#### Solana Fee Payer Configuration
- New `src/config/solana.ts` configuration file
- Maps facilitator names to their fee payer addresses
- Enables multi-facilitator support with proper fee sponsorship
- Synced with backend facilitator configurations

### 🔄 Enhanced Features

#### `useOnchainPay()` Hook
- **Before:** Hardcoded PayAI fee payer for all Solana transactions
- **After:** Dynamically selects best facilitator based on rankings
- Automatically uses correct fee payer for selected facilitator
- Better reliability through smart routing and failover

### 🎯 Benefits
- **Improved reliability:** Automatic failover if primary facilitator is down
- **Better performance:** Routes to fastest facilitator based on real-time data
- **Cost optimization:** Can route to cheapest facilitator when priority=cost
- **Multi-facilitator support:** No longer locked to single facilitator

### 📦 Package Updates
- Version bumped from 2.4.0 to 2.5.0
- Fully backwards compatible (existing code works unchanged)

---

## [1.0.0] - 2025-11-04

### 🎉 Major Release - Complete Refactor

This release transforms `@onchainfi/connect` from a basic wrapper into a production-ready, fully-configurable SDK with zero trade-offs.

### ✨ New Features

#### Multi-Chain Support
- **Base, Optimism, Arbitrum** support out of the box
- **Base Sepolia** testnet support
- Dynamic chain/token configuration
- Custom chain and token support
- Chain-specific token address resolution

#### New Components
- **`<PaymentForm>`** - Full-featured payment form with recipient, amount, and priority
- **`<PaymentButton>`** - One-click payment button for fixed amounts
- **`<BalanceDisplay>`** - Token balance display with auto-refresh
- **`<TransactionHistory>`** - Payment history with pagination

#### Enhanced Hooks
- **`useOnchainPay`** - Split verify/settle flow, multi-chain, lifecycle callbacks
  - `verify()` method for two-step payment flow
  - `settle()` method for completing payments
  - Granular state: `isVerifying`, `isSettling`
  - Error handling with `error` and `reset()`
  - Lifecycle callbacks for all payment stages
- **`useBalance()`** - Fetch token balances with auto-refresh
- **`usePaymentHistory()`** - Paginated payment history from API
- **`useNetworkStatus()`** - Real-time facilitator health monitoring

#### Configuration System
- **Full Privy configuration** passthrough
- **Custom Wagmi connectors** support
- **WalletConnect project ID** configuration
- **Custom RPC endpoints**
- **Theme customization** (logo, colors, landing header)
- **Token and chain defaults** configurable

#### Type System
- Comprehensive TypeScript types for all features
- Exported configuration types
- Hook parameter and return types
- Component prop types
- Utility types for tokens and chains

#### Utilities
- **Token formatting** - `formatTokenAmount()`, `parseTokenAmount()`
- **Chain helpers** - `getTokenConfig()`, `getChainConfig()`, etc.
- **Multi-chain constants** - `SUPPORTED_CHAINS`, `COMMON_TOKENS`

### 🔄 Enhanced Features

#### `<OnchainConnect>` Provider
- Support for custom chains array
- Support for custom transports
- Support for custom connectors
- Full Privy config override
- Default chain and token configuration
- API URL configuration

#### `useOnchainWallet()` Hook
- No changes (maintains compatibility)

#### `<WalletButton>` Component
- No changes (maintains compatibility)

### 📚 Documentation
- **Comprehensive README** with all features documented
- **API Reference** for all components and hooks
- **Advanced Examples** including:
  - Two-step payment with confirmation
  - Payment with lifecycle callbacks
  - Multi-chain payments
  - Custom chains and tokens
- **Migration guide** from 0.x
- **TypeScript usage** examples

### 🎯 Backwards Compatibility

**100% backwards compatible** - All existing code continues to work without changes:

```tsx
// This still works exactly as before
<OnchainConnect privyAppId="..." onchainApiKey="...">
  <App />
</OnchainConnect>
```

New features are entirely opt-in through additional optional props.

### 📦 Package Updates
- Version bumped to 1.0.0
- Updated description to reflect new capabilities
- All exports organized and documented

### 🏗️ Architecture

#### New Directory Structure
```
src/
├── components/
│   ├── OnchainConnect.tsx (enhanced)
│   ├── WalletButton.tsx (unchanged)
│   ├── PaymentForm.tsx (NEW)
│   ├── PaymentButton.tsx (NEW)
│   ├── BalanceDisplay.tsx (NEW)
│   └── TransactionHistory.tsx (NEW)
├── hooks/
│   ├── useOnchainWallet.ts (unchanged)
│   ├── useOnchainPay.ts (enhanced)
│   ├── useBalance.ts (NEW)
│   ├── usePaymentHistory.ts (NEW)
│   └── useNetworkStatus.ts (NEW)
├── config/
│   ├── chains.ts (NEW)
│   ├── tokens.ts (NEW)
│   └── defaults.ts (NEW)
├── context/
│   └── OnchainConfigContext.tsx (NEW)
└── types/
    └── config.ts (NEW)
```

### 🎨 Design Principles

1. **Backwards Compatible** - Zero breaking changes
2. **Progressive Enhancement** - New features are opt-in
3. **Zero Hardcoded Values** - Everything configurable
4. **Sensible Defaults** - Works out of the box
5. **Type Safety** - Comprehensive TypeScript support
6. **Developer Experience** - Simple for 90%, powerful for 10%

### 🚀 Performance
- No performance regressions
- Optimized re-renders with proper memoization
- Efficient auto-refresh intervals
- Smart caching for balance and history

### 📝 Breaking Changes
**None** - This is a fully backwards compatible release.

### 🐛 Bug Fixes
- Fixed hydration mismatches with wallet state
- Improved error messages for user-friendly display
- Better handling of insufficient balance errors

### 🙏 Credits
Built for the Onchain.fi ecosystem by the x402 team.

---

## [0.1.0] - Initial Release

- Basic OnchainConnect provider
- WalletButton component
- useOnchainWallet hook
- useOnchainPay hook (basic)
- Privy integration
- Wagmi integration
- Base chain support

