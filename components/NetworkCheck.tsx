'use client';

import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { polygonAmoy } from 'thirdweb/chains';
import { Icon } from '@/components/ui/icons';

export default function NetworkCheck() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchActiveWalletChain = useSwitchActiveWalletChain();

  if (!account) return null;

  // Check if user is on the correct network
  const isCorrectNetwork = activeChain?.id === polygonAmoy.id;

  if (!isCorrectNetwork) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <Icon name="warning" className="text-red-600 mr-2" />
          <div>
            <h3 className="text-red-800 font-semibold">Wrong Network</h3>
            <p className="text-red-700 text-sm">
              Please switch to Polygon Amoy testnet to use this app.
            </p>
            <div className="mt-2 text-xs text-red-600">
              <strong>Required:</strong> Polygon Amoy (Chain ID: 80002)
              <br />
              <strong>Current:</strong> {activeChain?.name || 'Unknown'} (Chain ID: {activeChain?.id || 'Unknown'})
            </div>
            <button
              onClick={() => switchActiveWalletChain(polygonAmoy)}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Switch to Polygon Amoy
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
