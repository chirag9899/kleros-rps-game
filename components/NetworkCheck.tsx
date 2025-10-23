'use client';

import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { polygonAmoy, sepolia } from 'thirdweb/chains';
import { Icon } from '@/components/ui/icons';

export default function NetworkCheck() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchActiveWalletChain = useSwitchActiveWalletChain();

  if (!account) return null;

  // Check if user is on a supported network
  const supportedChains = [polygonAmoy.id, sepolia.id];
  const isCorrectNetwork = activeChain?.id && supportedChains.includes(activeChain.id);

  if (!isCorrectNetwork) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <Icon name="warning" className="text-red-600 mr-2" />
          <div>
            <h3 className="text-red-800 font-semibold">Network Mismatch</h3>
            <p className="text-red-700 text-sm">
              Your wallet and the app are on different networks. Please sync them.
            </p>
            <div className="mt-2 text-xs text-red-600">
              <strong>Supported:</strong> Polygon Amoy (80002) or Ethereum Sepolia (11155111)
              <br />
              <strong>Current:</strong> {activeChain?.name || 'Unknown'} (Chain ID: {activeChain?.id || 'Unknown'})
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => switchActiveWalletChain(polygonAmoy)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium"
              >
                Switch to Polygon Amoy
              </button>
              <button
                onClick={() => switchActiveWalletChain(sepolia)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
              >
                Switch to Sepolia
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              If MetaMask shows a different network, click the network button in MetaMask to switch, or use the buttons above.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
