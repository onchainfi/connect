'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { Wallet, X, ChevronRight, Mail, Github, Copy, Check, Twitter } from 'lucide-react';

export interface WalletButtonProps {
  /** Custom button className */
  className?: string;
  
  /** Position style (default: 'fixed-bottom-left' for desktop, 'fixed-top-left' for mobile) */
  position?: 'fixed-bottom-left' | 'fixed-top-left' | 'inline';
  
  /** Show copy button when connected */
  showCopy?: boolean;
}

export function WalletButton({
  className,
  position = 'fixed-bottom-left',
  showCopy = true,
}: WalletButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { authenticated, user, logout } = usePrivy();
  const { login } = useLogin();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = (connector: typeof connectors[number]) => {
    connect({ connector });
    setShowModal(false);
  };

  const handlePrivyLogin = (method: 'email' | 'twitter' | 'github') => {
    login({
      loginMethods: [method],
    });
    setShowModal(false);
  };

  const handleDisconnect = () => {
    if (authenticated) {
      logout();
    }
    if (isConnected) {
      disconnect();
    }
  };

  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayAddress) {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayAddress = user?.wallet?.address || address;
  const isAnyConnected = authenticated || isConnected;

  const positionClasses = {
    'fixed-bottom-left': 'fixed bottom-16 left-8 z-50',
    'fixed-top-left': 'fixed top-6 left-6 z-50',
    'inline': 'relative',
  };

  return (
    <>
      {/* Main Button */}
      <div className={className || positionClasses[position]}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isAnyConnected ? handleDisconnect() : setShowModal(true))}
            className="backdrop-blur-md bg-black/40 border border-purple-500/30 rounded-full px-6 py-3 shadow-lg shadow-purple-500/20 hover:border-purple-400/50 transition-all duration-300 flex items-center gap-2"
          >
            <Wallet className="text-purple-300" size={18} />
            <span className="text-sm font-medium text-purple-300">
              {mounted && isAnyConnected && displayAddress
                ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
                : 'Connect'}
            </span>
          </button>

          {/* Copy Button */}
          {showCopy && mounted && isAnyConnected && displayAddress && (
            <button
              onClick={copyAddress}
              className="backdrop-blur-md bg-black/40 border border-purple-500/30 rounded-full p-3 shadow-lg shadow-purple-500/20 hover:border-purple-400/50 transition-all duration-300"
              title="Copy wallet address"
            >
              {copied ? (
                <Check className="text-green-400" size={18} />
              ) : (
                <Copy className="text-purple-300" size={18} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div
            className="relative bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-500/20 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                {isAnyConnected ? 'Connected' : 'Connect Wallet'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Connected State */}
            {isAnyConnected && displayAddress && (
              <div className="mb-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-xs text-purple-300/60 mb-2 uppercase tracking-wider">
                  Your Wallet Address
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-purple-200 font-mono break-all">
                    {displayAddress}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="flex-shrink-0 p-2 hover:bg-purple-500/20 rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="text-green-400" size={16} />
                    ) : (
                      <Copy className="text-purple-400" size={16} />
                    )}
                  </button>
                </div>
                {authenticated && (
                  <p className="text-xs text-purple-300/60 mt-3">
                    💡 Send USDC to this address to fund your embedded wallet
                  </p>
                )}
              </div>
            )}

            {!isAnyConnected && (
              <p className="text-purple-200/80 text-sm mb-6">
                Sign in with email, X, or GitHub to get started
              </p>
            )}

            {/* Disconnect Button */}
            {isAnyConnected && (
              <button
                onClick={handleDisconnect}
                className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-center gap-2 text-red-300 font-medium mb-4"
              >
                <X size={18} />
                Disconnect
              </button>
            )}

            {/* Privy Auth Options */}
            {!isAnyConnected && (
              <>
                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => handlePrivyLogin('email')}
                    className="w-full bg-black/40 hover:bg-black/60 border border-purple-500/30 hover:border-purple-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Mail className="text-purple-400" size={18} />
                      </div>
                      <span className="text-purple-200 font-medium group-hover:text-purple-100 transition-colors">
                        Continue with Email
                      </span>
                    </div>
                    <ChevronRight className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
                  </button>

                  <button
                    onClick={() => handlePrivyLogin('twitter')}
                    className="w-full bg-black/40 hover:bg-black/60 border border-purple-500/30 hover:border-purple-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Twitter className="text-purple-400" size={18} />
                      </div>
                      <span className="text-purple-200 font-medium group-hover:text-purple-100 transition-colors">
                        Continue with X
                      </span>
                    </div>
                    <ChevronRight className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
                  </button>

                  <button
                    onClick={() => handlePrivyLogin('github')}
                    className="w-full bg-black/40 hover:bg-black/60 border border-purple-500/30 hover:border-purple-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Github className="text-purple-400" size={18} />
                      </div>
                      <span className="text-purple-200 font-medium group-hover:text-purple-100 transition-colors">
                        Continue with GitHub
                      </span>
                    </div>
                    <ChevronRight className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-purple-500/20"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-black/90 px-2 text-purple-400/60">
                      Or connect wallet
                    </span>
                  </div>
                </div>

                {/* Wallet Options */}
                <div className="space-y-3">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className="w-full bg-black/40 hover:bg-black/60 border border-purple-500/30 hover:border-purple-400/50 rounded-lg px-6 py-4 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Wallet className="text-purple-400" size={18} />
                        </div>
                        <span className="text-purple-200 font-medium group-hover:text-purple-100 transition-colors">
                          {connector.name}
                        </span>
                      </div>
                      {isPending ? (
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ChevronRight className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Info */}
            <div className="mt-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <p className="text-purple-200/90 text-xs leading-relaxed">
                💡 <strong>New to crypto?</strong> Sign in with email, X, or GitHub to get an instant embedded wallet.
                Advanced users can connect their existing wallet (MetaMask, Coinbase Wallet, etc).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

