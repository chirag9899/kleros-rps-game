'use client';

import { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';
import GameContainer from '@/components/GameContainer';
import GameHistory from '@/components/GameHistory';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const account = useActiveAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGameCreated = (newContractAddress: string) => {
    setContractAddress(newContractAddress);
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLoadGame = (address: string) => {
    setContractAddress(address);
    setRefreshKey(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Rock Paper Scissors Lizard Spock
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Play the ultimate version of Rock Paper Scissors on Polygon Amoy testnet
            </p>
            <div className="flex justify-center mb-6">
              <ConnectButton client={client} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter contract address (0x...)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <GameContainer
                  key={`${contractAddress}-${refreshKey}`}
                  contractAddress={contractAddress}
                  onGameCreated={handleGameCreated}
                  onRefresh={handleRefresh}
                  account={account}
                  refreshKey={refreshKey}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <GameHistory onLoadGame={handleLoadGame} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}