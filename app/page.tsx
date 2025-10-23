'use client';

import { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { client, chain } from '@/lib/thirdweb';
import { polygonAmoy, sepolia } from 'thirdweb/chains';
import GameContainer from '@/components/GameContainer';
import GameHistory from '@/components/GameHistory';
import NetworkCheck from '@/components/NetworkCheck';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeChain) {
      setRefreshKey(prev => prev + 1);
    }
  }, [activeChain?.id]);

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
              Play Rock Paper Scissors Lizard Spock on Polygon Amoy or Ethereum Sepolia testnet
            </p>
            <div className="flex justify-center mb-6">
              <ConnectButton 
                client={client}
                chains={[polygonAmoy, sepolia]}
                connectButton={{
                  label: "Connect Wallet",
                }}
              />
            </div>
            
            {account && activeChain && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Connected to {activeChain.name} (Chain ID: {activeChain.id})
                </div>
              </div>
            )}
          </div>

          <NetworkCheck />
          
          
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