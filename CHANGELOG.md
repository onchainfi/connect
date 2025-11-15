# Changelog

All notable changes to this project will be documented in this file.

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

