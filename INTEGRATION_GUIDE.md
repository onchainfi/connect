# @onchainfi/connect - Integration Guide

Get up and running with wallet authentication and x402 payments in under 5 minutes.

## 🚀 Quick Integration (3 Steps)

### Step 1: Install

```bash
npm install @onchainfi/connect
# or
pnpm add @onchainfi/connect
# or
yarn add @onchainfi/connect
```

### Step 2: Get API Keys

**Privy App ID** (Required for wallet auth):
1. Go to [dashboard.privy.io](https://dashboard.privy.io)
2. Sign up and create a new app
3. Copy your App ID (looks like `clz6jx1j8...`)

**Onchain API Key** (Required for payments):
1. Visit [onchain.fi/get-api-key](https://onchain.fi/get-api-key)
2. Enter your email
3. Check your inbox for the API key

### Step 3: Wrap Your App

```tsx
// app/layout.tsx or _app.tsx
import { OnchainConnect } from '@onchainfi/connect';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OnchainConnect
          privyAppId="your-privy-app-id"
          onchainApiKey="your-onchain-api-key"
        >
          {children}
        </OnchainConnect>
      </body>
    </html>
  );
}
```

**Done!** You now have wallet authentication and payment capabilities.

---

## 🎨 Add UI Components

### Option A: Use Pre-Built Components (Easiest)

```tsx
import { WalletButton, PaymentForm } from '@onchainfi/connect';

export default function MyPage() {
  return (
    <div>
      <WalletButton />
      
      <PaymentForm
        recipientAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        defaultAmount="0.10"
        onSuccess={({ txHash }) => alert(`Paid! TX: ${txHash}`)}
      />
    </div>
  );
}
```

### Option B: Build Custom UI with Hooks

```tsx
import { useOnchainWallet, useOnchainPay } from '@onchainfi/connect';

export default function CustomPayment() {
  const { address, isConnected } = useOnchainWallet();
  const { pay, isPaying } = useOnchainPay();

  const handlePay = async () => {
    await pay({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '0.10',
      onSuccess: (txHash) => console.log('Success!', txHash),
      onError: (error) => console.error('Failed:', error),
    });
  };

  return (
    <div>
      {!isConnected ? (
        <p>Please connect wallet</p>
      ) : (
        <button onClick={handlePay} disabled={isPaying}>
          {isPaying ? 'Paying...' : 'Pay $0.10'}
        </button>
      )}
    </div>
  );
}
```

---

## 📋 Common Scenarios

### Scenario 1: Simple Payment Button

```tsx
import { PaymentButton } from '@onchainfi/connect';

<PaymentButton
  to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  amount="0.10"
  onSuccess={(txHash) => console.log('Paid!', txHash)}
>
  Donate $0.10
</PaymentButton>
```

### Scenario 2: Show User's Balance

```tsx
import { BalanceDisplay } from '@onchainfi/connect';

<BalanceDisplay 
  format="full" 
  showRefresh={true}
/>
// Displays: "0.50 USDC" with refresh button
```

### Scenario 3: Payment History

```tsx
import { TransactionHistory } from '@onchainfi/connect';

<TransactionHistory 
  limit={10}
  autoRefresh={true}
/>
```

### Scenario 4: Two-Step Payment (Verify → Confirm → Settle)

```tsx
import { useOnchainPay } from '@onchainfi/connect';

function PaymentWithConfirmation() {
  const { verify, settle, isVerifying, isSettling } = useOnchainPay();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleVerify = async () => {
    const result = await verify({
      to: '0x...',
      amount: '0.10',
    });
    
    if (result.success) {
      setShowConfirm(true);  // Show confirmation UI
    }
  };

  const handleConfirm = async () => {
    const result = await settle();
    if (result.success) {
      alert(`Paid! TX: ${result.txHash}`);
    }
  };

  return (
    <div>
      <button onClick={handleVerify} disabled={isVerifying}>
        Review Payment
      </button>
      
      {showConfirm && (
        <div>
          <p>Confirm payment of $0.10 to 0x...?</p>
          <button onClick={handleConfirm} disabled={isSettling}>
            Confirm & Send
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🎛️ Advanced Configuration

### Custom Chains & Connectors

```tsx
import { OnchainConnect } from '@onchainfi/connect';
import { base, optimism, arbitrum } from 'wagmi/chains';
import { walletConnect, coinbaseWallet, injected } from 'wagmi/connectors';

<OnchainConnect
  privyAppId="..."
  onchainApiKey="..."
  
  // Multi-chain
  chains={[base, optimism, arbitrum]}
  defaultChain={base}
  
  // Custom connectors
  connectors={[
    injected(),
    walletConnect({ projectId: 'your-walletconnect-project-id' }),
    coinbaseWallet({ appName: 'My App Name' }),
  ]}
  
  // Custom theme
  appearance={{
    theme: 'dark',
    accentColor: '#7C3AED',
    logo: '/my-logo.svg',
    landingHeader: 'Connect to My App',
    showWalletLoginFirst: false,
  }}
  
  // Auth methods
  loginMethods={['email', 'twitter', 'github', 'wallet']}
>
  <App />
</OnchainConnect>
```

### Payment with Lifecycle Callbacks

```tsx
const { pay } = useOnchainPay({
  callbacks: {
    onSigningStart: () => console.log('Opening wallet...'),
    onSigningComplete: () => console.log('Signed!'),
    onVerificationStart: () => console.log('Verifying...'),
    onVerificationComplete: () => console.log('Verified!'),
    onSettlementStart: () => console.log('Settling...'),
    onSettlementComplete: () => console.log('Done!'),
  },
});
```

---

## 💅 Styling

The package includes Tailwind CSS classes. Add to your `tailwind.config.js`:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@onchainfi/connect/dist/**/*.{js,mjs}', // Add this
  ],
  // ...
}
```

All components accept `className` for custom styling:

```tsx
<WalletButton className="my-custom-class" />
<PaymentForm className="w-full max-w-md" />
```

---

## 🌐 Environment Variables

Create a `.env.local` file:

```bash
# Required
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Required for payments
NEXT_PUBLIC_API_KEY=your-onchain-api-key

# Optional
NEXT_PUBLIC_API_URL=https://api.onchain.fi  # Default
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-wc-id  # For WalletConnect
```

Then use in your app:

```tsx
<OnchainConnect
  privyAppId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  onchainApiKey={process.env.NEXT_PUBLIC_API_KEY}
>
  <App />
</OnchainConnect>
```

---

## 🔧 Framework-Specific Setup

### Next.js (App Router)

```tsx
// app/layout.tsx
import { OnchainConnect } from '@onchainfi/connect';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OnchainConnect
          privyAppId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          onchainApiKey={process.env.NEXT_PUBLIC_API_KEY}
        >
          {children}
        </OnchainConnect>
      </body>
    </html>
  );
}
```

### Next.js (Pages Router)

```tsx
// pages/_app.tsx
import { OnchainConnect } from '@onchainfi/connect';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <OnchainConnect
      privyAppId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      onchainApiKey={process.env.NEXT_PUBLIC_API_KEY}
    >
      <Component {...pageProps} />
    </OnchainConnect>
  );
}
```

### Vite/Create React App

```tsx
// main.tsx or index.tsx
import { OnchainConnect } from '@onchainfi/connect';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <OnchainConnect
    privyAppId={import.meta.env.VITE_PRIVY_APP_ID}
    onchainApiKey={import.meta.env.VITE_ONCHAIN_API_KEY}
  >
    <App />
  </OnchainConnect>
);
```

---

## 🧪 Testing Your Integration

### Test Wallet Connection

1. Run your app
2. Click the wallet button
3. Try connecting with:
   - ✅ Email (creates embedded wallet)
   - ✅ Twitter/GitHub (creates embedded wallet)
   - ✅ MetaMask/External wallet

### Test Payment Flow

1. Connect wallet
2. Fund with testnet USDC (or use mainnet)
3. Try a small payment (e.g., $0.01)
4. Verify you see:
   - Signature request
   - Loading states
   - Success message with transaction hash

---

## ❓ Troubleshooting

### "Module not found: @onchainfi/connect"
- Make sure you ran `npm install @onchainfi/connect`
- Restart your dev server

### "Wallet not connected" error
- Make sure you wrapped your app with `<OnchainConnect>`
- Check that `privyAppId` is set correctly

### "API key not provided" error when paying
- Pass `onchainApiKey` to `<OnchainConnect>`
- Or pass to `useOnchainPay({ apiKey: '...' })`

### Tailwind styles not working
- Add the content path to `tailwind.config.js`
- Restart your dev server after config changes

### TypeScript errors
- Make sure you have `@types/react` and `@types/react-dom` installed
- Check peer dependencies are satisfied (React 18+, Wagmi 2+, Viem 2+)

---

## 📚 Full Example App

Here's a complete minimal example:

```tsx
// app/layout.tsx
import { OnchainConnect } from '@onchainfi/connect';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <OnchainConnect
          privyAppId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          onchainApiKey={process.env.NEXT_PUBLIC_API_KEY}
        >
          {children}
        </OnchainConnect>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
'use client';

import { 
  WalletButton, 
  PaymentForm, 
  BalanceDisplay,
  TransactionHistory 
} from '@onchainfi/connect';

export default function HomePage() {
  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My App</h1>
        <div className="flex gap-4">
          <BalanceDisplay showRefresh={true} />
          <WalletButton position="inline" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Send Payment</h2>
          <PaymentForm
            defaultAmount="0.10"
            onSuccess={({ txHash }) => {
              console.log('Payment successful!', txHash);
            }}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          <TransactionHistory limit={5} />
        </section>
      </main>
    </div>
  );
}
```

```env
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=clz6jx1j8006712n37lfd6qka
NEXT_PUBLIC_API_KEY=your-onchain-api-key
```

**That's it!** Run `npm run dev` and you have:
- ✅ Wallet connection (email, social, external wallets)
- ✅ Balance display
- ✅ Payment form
- ✅ Transaction history

---

## 🎯 Real-World Use Cases

### Use Case 1: Content Paywall

```tsx
'use client';

import { useOnchainWallet, PaymentButton } from '@onchainfi/connect';
import { useState } from 'react';

export default function PremiumContent() {
  const { isConnected } = useOnchainWallet();
  const [hasPaid, setHasPaid] = useState(false);

  if (!isConnected) {
    return <p>Connect wallet to access premium content</p>;
  }

  if (!hasPaid) {
    return (
      <div>
        <h2>Premium Content - $0.50</h2>
        <PaymentButton
          to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
          amount="0.50"
          onSuccess={() => setHasPaid(true)}
        >
          Unlock Content ($0.50)
        </PaymentButton>
      </div>
    );
  }

  return (
    <article>
      <h1>Premium Content Unlocked! 🎉</h1>
      {/* Your premium content here */}
    </article>
  );
}
```

### Use Case 2: Donation Widget

```tsx
import { PaymentButton } from '@onchainfi/connect';

const DONATION_AMOUNTS = ['0.10', '0.50', '1.00', '5.00'];

export function DonationWidget() {
  return (
    <div>
      <h3>Support Our Work</h3>
      <div className="grid grid-cols-2 gap-2">
        {DONATION_AMOUNTS.map(amount => (
          <PaymentButton
            key={amount}
            to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
            amount={amount}
            onSuccess={() => alert('Thank you for donating!')}
          >
            ${amount}
          </PaymentButton>
        ))}
      </div>
    </div>
  );
}
```

### Use Case 3: E-Commerce Checkout

```tsx
import { useOnchainPay } from '@onchainfi/connect';

export function CheckoutButton({ cartTotal, merchantAddress }) {
  const { pay, isPaying } = useOnchainPay();

  const handleCheckout = async () => {
    const result = await pay({
      to: merchantAddress,
      amount: cartTotal.toString(),
      priority: 'speed',
      onSuccess: (txHash) => {
        // Mark order as paid
        fetch('/api/orders/complete', {
          method: 'POST',
          body: JSON.stringify({ txHash }),
        });
      },
    });
  };

  return (
    <button onClick={handleCheckout} disabled={isPaying}>
      {isPaying ? 'Processing...' : `Pay $${cartTotal}`}
    </button>
  );
}
```

---

## 🔐 Security Best Practices

### 1. Never Expose API Keys in Client Code

**❌ DON'T:**
```tsx
<OnchainConnect
  privyAppId="clz..."
  onchainApiKey="hardcoded-key-123"  // NEVER DO THIS
>
```

**✅ DO:**
```tsx
<OnchainConnect
  privyAppId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  onchainApiKey={process.env.NEXT_PUBLIC_API_KEY}
>
```

### 2. Validate Payments Server-Side

For production apps, always verify payments on your backend:

```typescript
// app/api/verify-payment/route.ts
export async function POST(req: Request) {
  const { txHash } = await req.json();
  
  // Verify the transaction actually happened on-chain
  // Check it matches expected amount/recipient
  // Then grant access/fulfill order
  
  return Response.json({ verified: true });
}
```

### 3. Use Environment-Specific Keys

- **Development**: Use testnet and test API keys
- **Production**: Use mainnet and production API keys

---

## 📱 Responsive Design

All components are mobile-responsive out of the box:

```tsx
// Wallet button adapts to screen size
<WalletButton />  // Fixed bottom-left on desktop, top-left on mobile

// Or customize position
<WalletButton position="inline" />  // Inline with your nav
```

---

## 🎨 Customization Examples

### Custom Styled Payment Form

```tsx
<PaymentForm
  className="bg-gray-900 p-6 rounded-xl"
  theme="minimal"
  buttonText="Send USDC"
  recipientLabel="Send To"
  amountLabel="Amount (USD)"
  showPrioritySelector={true}
/>
```

### Custom Wallet Button

```tsx
<WalletButton
  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
  position="inline"
  showCopy={true}
/>
```

---

## 🧩 TypeScript Support

Full type safety out of the box:

```typescript
import type {
  OnchainConnectProps,
  PaymentParams,
  PaymentResult,
  PaymentFormProps,
  BalanceData,
  TokenConfig,
} from '@onchainfi/connect';

const handlePay = async (params: PaymentParams): Promise<PaymentResult> => {
  // Fully typed!
};
```

---

## 🆘 Need Help?

- **Email**: dev@onchain.fi
- **Docs**: [onchain.fi/docs](https://onchain.fi/docs)
- **GitHub Issues**: [github.com/onchainfi/connect/issues](https://github.com/onchainfi/connect/issues)
- **Examples**: See `examples/` folder in the repo

---

## 📦 What's Included

| Component | Description |
|-----------|-------------|
| `<OnchainConnect>` | Provider wrapper (required) |
| `<WalletButton>` | Wallet connection UI |
| `<PaymentForm>` | Full payment form |
| `<PaymentButton>` | One-click payment |
| `<BalanceDisplay>` | Token balance display |
| `<TransactionHistory>` | Payment history |

| Hook | Purpose |
|------|---------|
| `useOnchainWallet()` | Wallet state (address, connection) |
| `useOnchainPay()` | Execute payments |
| `useBalance()` | Token balance |
| `usePaymentHistory()` | Payment history |
| `useNetworkStatus()` | Facilitator health |

---

## ✅ Integration Checklist

Before going to production:

- [ ] Installed `@onchainfi/connect`
- [ ] Got Privy App ID
- [ ] Got Onchain API Key
- [ ] Set environment variables
- [ ] Wrapped app with `<OnchainConnect>`
- [ ] Added Tailwind content path
- [ ] Tested wallet connection (email, social, external)
- [ ] Tested payment flow end-to-end
- [ ] Implemented error handling
- [ ] Added analytics/logging
- [ ] Tested on mobile devices
- [ ] Set up production API keys (not dev keys)

---

**Ready to ship!** 🚀

For more details, see the [full README](./README.md) and [API documentation](https://onchain.fi/docs).

