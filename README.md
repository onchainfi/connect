# @onchainfi/connect

Unified wallet authentication and x402 payment SDK. Connect users via email, social login, or external wallets - all with one component.

## Features

- 🔐 **Email & Social Login** - Email, Twitter/X, GitHub via Privy
- 👛 **External Wallets** - MetaMask, Coinbase Wallet, WalletConnect
- 🎨 **Pre-Built UI** - Beautiful wallet button and modal (customizable)
- 💸 **x402 Payments** - Built-in smart payment routing
- 🚀 **Zero Config** - Just add API keys and go
- 📦 **TypeScript** - Fully typed

## Installation

```bash
npm install @onchainfi/connect
# or
pnpm add @onchainfi/connect
# or
yarn add @onchainfi/connect
```

## Quick Start

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

### 2. Add Wallet Button

```tsx
import { WalletButton } from '@onchainfi/connect';

function Header() {
  return (
    <nav>
      <WalletButton />
    </nav>
  );
}
```

### 3. Use Wallet & Payments

```tsx
import { useOnchainWallet, useOnchainPay } from '@onchainfi/connect';

function PaymentButton() {
  const { address, isConnected } = useOnchainWallet();
  const { pay, isPaying } = useOnchainPay();

  const handlePay = async () => {
    const result = await pay({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '0.10', // $0.10 in USDC
      onSuccess: (txHash) => console.log('Paid!', txHash),
      onError: (error) => console.error('Failed:', error),
    });
  };

  if (!isConnected) {
    return <div>Please connect wallet</div>;
  }

  return (
    <button onClick={handlePay} disabled={isPaying}>
      {isPaying ? 'Processing...' : 'Pay $0.10'}
    </button>
  );
}
```

## API Reference

### `<OnchainConnect>`

Main provider component that wraps your app.

**Props:**
- `privyAppId` (required): Your Privy App ID
- `onchainApiKey` (optional): Your Onchain API key (required for payments)
- `appearance` (optional): Custom theme settings
- `loginMethods` (optional): Array of auth methods to enable

**Example:**
```tsx
<OnchainConnect
  privyAppId="clz..."
  onchainApiKey="onchain_..."
  appearance={{
    theme: 'dark',
    accentColor: '#7C3AED',
    logo: '/logo.svg',
  }}
  loginMethods={['email', 'twitter', 'github', 'wallet']}
>
  <App />
</OnchainConnect>
```

### `<WalletButton>`

Pre-built wallet connection button.

**Props:**
- `className` (optional): Custom CSS class
- `position` (optional): `'fixed-bottom-left'` | `'fixed-top-left'` | `'inline'`
- `showCopy` (optional): Show copy address button (default: true)

### `useOnchainWallet()`

Hook for accessing wallet state.

**Returns:**
```typescript
{
  address: string | undefined;
  isConnected: boolean;
  isPrivyUser: boolean;
  isExternalWallet: boolean;
  user: any;
  login: () => void;
  logout: () => void;
}
```

### `useOnchainPay(apiKey?, apiUrl?)`

Hook for making x402 payments.

**Parameters:**
- `apiKey` (optional): Override API key from provider
- `apiUrl` (optional): Override API URL (default: production)

**Returns:**
```typescript
{
  pay: (params: PaymentParams) => Promise<PaymentResult>;
  isPaying: boolean;
  isReady: boolean;
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

Or include the base styles in your global CSS for a purple cyberpunk theme.

## TypeScript

Fully typed out of the box. Import types:

```typescript
import type { 
  OnchainWallet, 
  PaymentParams, 
  PaymentResult 
} from '@onchainfi/connect';
```

## License

AGPL-3.0

## Links

- [Documentation](https://onchain.fi/docs)
- [GitHub](https://github.com/onchainfi/connect)
- [Website](https://onchain.fi)

