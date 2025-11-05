# @onchainfi/connect

Unified wallet authentication and x402 payment SDK. Connect users via email, social login, or external wallets - all with one component.

## Features

- 🔐 **Email & Social Login** - Email, Twitter/X, GitHub via Privy
- 👛 **External Wallets** - MetaMask, Coinbase Wallet, WalletConnect
- 🎨 **Pre-Built UI** - Beautiful components (wallet, payments, balance, history)
- 💸 **x402 Payments** - Built-in smart payment routing with multi-chain support
- 🌐 **Multi-Chain** - Base, Optimism, Arbitrum (easily extensible)
- ⚡ **Split Verify/Settle** - Full control over payment flow
- 📊 **Built-in Analytics** - Balance tracking, payment history, network status
- 🚀 **Zero Config** - Works out of the box with sensible defaults
- 🎛️ **Fully Configurable** - Override anything you need
- 📦 **TypeScript** - Fully typed with comprehensive type exports

## Installation

```bash
npm install @onchainfi/connect
# or
pnpm add @onchainfi/connect
# or
yarn add @onchainfi/connect
```

**📖 New to the package?** See the [Integration Guide](./INTEGRATION_GUIDE.md) for step-by-step instructions with real-world examples.

## Quick Start (Simple)

### 1. Wrap Your App

```tsx
import { OnchainConnect } from '@onchainfi/connect';

function App() {
  return (
    <OnchainConnect
      privyAppId="your-privy-app-id"
      onchainApiKey="your-onchain-api-key"
    >
      <YourApp />
    </OnchainConnect>
  );
}
```

### 2. Add Components

```tsx
import { WalletButton, PaymentForm, BalanceDisplay } from '@onchainfi/connect';

function MyApp() {
  return (
    <div>
      <WalletButton />
      <BalanceDisplay />
      <PaymentForm
        recipientAddress="0x..."
        defaultAmount="0.10"
        onSuccess={({ txHash }) => console.log('Paid!', txHash)}
      />
    </div>
  );
}
```

That's it! You now have a full payment UI with wallet connection, balance display, and payment form.

## Quick Start (Advanced)

For full control over configuration:

```tsx
import { OnchainConnect } from '@onchainfi/connect';
import { base, optimism, arbitrum } from 'wagmi/chains';
import { walletConnect, coinbaseWallet } from 'wagmi/connectors';

function App() {
  return (
    <OnchainConnect
      privyAppId="your-privy-app-id"
      onchainApiKey="your-api-key"
      
      // Multi-chain support
      chains={[base, optimism, arbitrum]}
      defaultChain={base}
      
      // Custom wallet connectors
      connectors={[
        walletConnect({ projectId: 'your-walletconnect-id' }),
        coinbaseWallet({ appName: 'My App' }),
      ]}
      
      // Custom appearance
      appearance={{
        theme: 'dark',
        accentColor: '#7C3AED',
        logo: '/logo.svg',
        landingHeader: 'Connect to My App',
        showWalletLoginFirst: false,
      }}
      
      // Auth methods
      loginMethods={['email', 'twitter', 'github', 'wallet']}
    >
      <YourApp />
    </OnchainConnect>
  );
}
```

## API Reference

### Components

#### `<OnchainConnect>`

Main provider component that wraps your app.

**Props:**
```typescript
{
  // Required
  privyAppId: string;
  
  // Payment Configuration
  onchainApiKey?: string;
  onchainApiUrl?: string;
  
  // Chain Configuration
  chains?: Chain[];
  transports?: Record<number, Transport>;
  connectors?: Connector[];
  wagmiConfig?: Config;  // Or pass full wagmi config
  defaultChain?: Chain;
  defaultToken?: TokenConfig;
  
  // Privy Configuration
  appearance?: {
    theme?: 'light' | 'dark';
    accentColor?: string;
    logo?: string;
    landingHeader?: string;
    showWalletLoginFirst?: boolean;
    walletList?: string[];
  };
  loginMethods?: ('email' | 'twitter' | 'github' | 'google' | 'wallet')[];
  privyConfig?: Partial<PrivyClientConfig>;  // Full Privy override
}
```

#### `<WalletButton>`

Pre-built wallet connection button with modal.

**Props:**
```typescript
{
  className?: string;
  position?: 'fixed-bottom-left' | 'fixed-top-left' | 'inline';
  showCopy?: boolean;  // Show copy address button (default: true)
}
```

#### `<PaymentForm>`

Full payment form with recipient, amount, and optional priority selector.

**Props:**
```typescript
{
  // Recipient
  recipientAddress?: string;
  recipientLabel?: string;
  recipientPlaceholder?: string;
  allowRecipientEdit?: boolean;
  
  // Amount
  defaultAmount?: string;
  amountLabel?: string;
  amountPlaceholder?: string;
  minAmount?: string;
  maxAmount?: string;
  
  // Token & Network
  token?: TokenConfig;
  showTokenSelector?: boolean;
  network?: string;
  showNetworkSelector?: boolean;
  
  // Priority
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';
  showPrioritySelector?: boolean;
  
  // Callbacks
  onSuccess?: (result: { txHash?: string }) => void;
  onError?: (error: Error) => void;
  onSubmit?: (params: PaymentParams) => void;
  
  // Styling
  className?: string;
  buttonText?: string;
  theme?: 'default' | 'minimal';
}
```

**Example:**
```tsx
<PaymentForm
  recipientAddress="0x..."
  defaultAmount="0.10"
  priority="balanced"
  onSuccess={({ txHash }) => console.log('Paid!', txHash)}
/>
```

#### `<PaymentButton>`

One-click payment button with fixed recipient/amount.

**Props:**
```typescript
{
  to: string;  // Recipient address
  amount: string;
  token?: TokenConfig;
  network?: string;
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';
  children?: ReactNode;
  className?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  showSuccess?: boolean;
}
```

**Example:**
```tsx
<PaymentButton
  to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  amount="0.10"
  onSuccess={(tx) => alert('Paid!')}
>
  Pay $0.10
</PaymentButton>
```

#### `<BalanceDisplay>`

Display token balance with optional refresh.

**Props:**
```typescript
{
  token?: TokenConfig;
  address?: `0x${string}`;
  format?: 'full' | 'compact' | 'symbol-only';
  showRefresh?: boolean;
  className?: string;
  label?: string;
  watch?: boolean;  // Auto-refresh on chain updates
}
```

**Example:**
```tsx
<BalanceDisplay 
  format="full" 
  showRefresh={true}
  label="Your Balance"
/>
```

#### `<TransactionHistory>`

Display payment history with pagination.

**Props:**
```typescript
{
  limit?: number;
  address?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  showLoadMore?: boolean;
  explorerUrl?: string;
}
```

**Example:**
```tsx
<TransactionHistory 
  limit={10}
  autoRefresh={true}
  refreshInterval={30000}
/>
```

### Hooks

#### `useOnchainWallet()`

Access wallet state (unified Privy + Wagmi).

**Returns:**
```typescript
{
  address: string | undefined;
  isConnected: boolean;
  isPrivyUser: boolean;  // Social/email login
  isExternalWallet: boolean;  // MetaMask, etc.
  user: any;
  login: () => void;
  logout: () => void;
}
```

#### `useOnchainPay(config?)`

Make x402 payments with full control.

**Config:**
```typescript
{
  apiKey?: string;
  apiUrl?: string;
  network?: string;
  chainId?: number;
  token?: TokenConfig;
  autoVerify?: boolean;  // Default: true
  autoSettle?: boolean;  // Default: true
  retryOnFail?: boolean;
  maxRetries?: number;
  callbacks?: {
    onSigningStart?: () => void;
    onSigningComplete?: () => void;
    onVerificationStart?: () => void;
    onVerificationComplete?: () => void;
    onSettlementStart?: () => void;
    onSettlementComplete?: () => void;
  };
}
```

**Returns:**
```typescript
{
  pay: (params: PaymentParams) => Promise<PaymentResult>;
  verify: (params: PaymentParams) => Promise<PaymentResult>;  // NEW
  settle: (params?: Partial<PaymentParams>) => Promise<PaymentResult>;  // NEW
  isPaying: boolean;
  isVerifying: boolean;  // NEW
  isSettling: boolean;  // NEW
  isReady: boolean;
  lastTxHash?: string;  // NEW
  error?: Error;  // NEW
  reset: () => void;  // NEW
}
```

**Two-Step Payment Flow:**
```tsx
const { verify, settle, isVerifying, isSettling } = useOnchainPay();

// Step 1: Verify payment
await verify({ to: '0x...', amount: '0.10' });

// Step 2: Show confirmation, then settle
await settle();
```

#### `useBalance(config?)`

Fetch token balance for connected wallet.

**Config:**
```typescript
{
  token?: TokenConfig;
  address?: `0x${string}`;
  watch?: boolean;  // Auto-refresh
}
```

**Returns:**
```typescript
{
  value: bigint;
  formatted: string;
  symbol: string;
  decimals: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}
```

#### `usePaymentHistory(config?)`

Fetch payment history from Onchain API.

**Config:**
```typescript
{
  limit?: number;
  address?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
```

**Returns:**
```typescript
{
  payments: PaymentHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}
```

#### `useNetworkStatus(config?)`

Fetch facilitator health and network status.

**Config:**
```typescript
{
  autoRefresh?: boolean;
  refreshInterval?: number;
  network?: string;
}
```

**Returns:**
```typescript
{
  facilitators: FacilitatorHealth[];
  isHealthy: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => Promise<void>;
}
```

## Multi-Chain Support

The package supports multiple chains out of the box:

```tsx
import { SUPPORTED_CHAINS, getTokenConfig } from '@onchainfi/connect';

// Supported chains: Base, Optimism, Arbitrum, Base Sepolia
const baseUSDC = SUPPORTED_CHAINS.base.tokens.usdc;
const optimismUSDC = SUPPORTED_CHAINS.optimism.tokens.usdc;

// Or use helper functions
const usdcAddress = getTokenConfig(8453, 'usdc'); // Base USDC
```

### Custom Chains

Add custom chains and tokens:

```tsx
import { OnchainConnect } from '@onchainfi/connect';

const myCustomChain = {
  id: 123456,
  name: 'My Chain',
  // ... chain config
};

const myCustomToken = {
  address: '0x...',
  symbol: 'MYT',
  decimals: 18,
  name: 'My Token',
};

<OnchainConnect
  chains={[myCustomChain]}
  defaultToken={myCustomToken}
  // ...
/>
```

## Advanced Examples

### Two-Step Payment with Confirmation

```tsx
function PaymentWithConfirmation() {
  const { verify, settle, isVerifying, isSettling } = useOnchainPay();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleVerify = async () => {
    const result = await verify({
      to: '0x...',
      amount: '0.10',
    });
    
    if (result.success) {
      setShowConfirm(true);
    }
  };

  const handleSettle = async () => {
    const result = await settle();
    if (result.success) {
      alert(`Payment sent! TX: ${result.txHash}`);
    }
  };

  return (
    <div>
      <button onClick={handleVerify} disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Review Payment'}
      </button>
      
      {showConfirm && (
        <div>
          <p>Confirm payment of $0.10?</p>
          <button onClick={handleSettle} disabled={isSettling}>
            {isSettling ? 'Sending...' : 'Confirm & Send'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### Payment with Lifecycle Callbacks

```tsx
const { pay } = useOnchainPay({
  callbacks: {
    onSigningStart: () => console.log('Opening wallet...'),
    onSigningComplete: () => console.log('Signature received'),
    onVerificationStart: () => console.log('Verifying payment...'),
    onVerificationComplete: () => console.log('Payment verified'),
    onSettlementStart: () => console.log('Settling on-chain...'),
    onSettlementComplete: () => console.log('Settlement complete'),
  },
});

await pay({ to: '0x...', amount: '0.10' });
```

### Multi-Chain Payment

```tsx
import { useOnchainPay } from '@onchainfi/connect';
import { optimism } from 'wagmi/chains';

function OptimismPayment() {
  const { pay } = useOnchainPay({
    network: 'optimism',
    chainId: optimism.id,
  });

  return (
    <button onClick={() => pay({ 
      to: '0x...', 
      amount: '0.10' 
    })}>
      Pay on Optimism
    </button>
  );
}
```

## Getting API Keys

### Privy App ID
1. Visit [dashboard.privy.io](https://dashboard.privy.io)
2. Create account and new app
3. Copy your App ID

### Onchain API Key
1. Visit [onchain.fi/get-api-key](https://onchain.fi/get-api-key)
2. Enter your email
3. Copy API key from email

## Styling

The package uses Tailwind CSS utility classes. Add these to your `tailwind.config`:

```js
module.exports = {
  content: [
    './node_modules/@onchainfi/connect/dist/**/*.{js,mjs}',
    // ... your other paths
  ],
  // ...
}
```

The default theme is a purple cyberpunk aesthetic. All components accept `className` props for custom styling.

## TypeScript

Fully typed out of the box. Import types as needed:

```typescript
import type { 
  // Components
  OnchainConnectProps,
  PaymentFormProps,
  PaymentButtonProps,
  
  // Hooks
  PaymentParams,
  PaymentResult,
  BalanceData,
  PaymentHistoryItem,
  
  // Config
  TokenConfig,
  ChainConfig,
  UseOnchainPayConfig,
} from '@onchainfi/connect';
```

## Migration from 0.x

If upgrading from version 0.x:

1. **No breaking changes** - Simple usage still works identically
2. **New features are opt-in** - All new props are optional
3. **Enhanced hooks** - `useOnchainPay` returns additional methods (`verify`, `settle`)
4. **New components** - `PaymentForm`, `PaymentButton`, etc. are new additions

## License

AGPL-3.0

## Links

- [Documentation](https://onchain.fi/docs)
- [GitHub](https://github.com/onchainfi/connect)
- [Website](https://onchain.fi)
- [X (Twitter)](https://twitter.com/onchainfi)

## Support

- Email: dev@onchain.fi
- Discord: [Join our community](https://discord.gg/onchainfi)
- GitHub Issues: [Report bugs](https://github.com/onchainfi/connect/issues)

