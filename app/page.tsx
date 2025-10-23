'use client';

import { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { client, chain } from '@/lib/thirdweb';
import { polygonAmoy, sepolia } from 'thirdweb/chains';
import GameContainer from '@/components/GameContainer';
import GameHistory from '@/components/GameHistory';
import NetworkCheck from '@/components/NetworkCheck';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CometCard } from '@/components/ui/comet-card';

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
      <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{ backgroundImage: 'url(/bg.jpg)' }}>
        <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/bg.jpg)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center">
              <img 
                src="/favicon.ico" 
                alt="RPS Logo" 
                className="w-10 h-10"
              />
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <ConnectButton 
                theme="light"
                client={client}
                chains={[polygonAmoy, sepolia]}
                connectButton={{
                  label: "Connect Wallet",
                }}
              />
              
              {account && activeChain && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100/80 backdrop-blur-sm text-blue-800 border border-blue-200/50">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Connected to {activeChain.name} (Chain ID: {activeChain.id})
                </div>
              )}
            </div>
          </div>

          <NetworkCheck />
          
          
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-start">
            <div className="flex-1 max-w-2xl">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-pink-200/50">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder={account ? "Enter contract address (0x...)" : "Please connect your wallet first"}
                    disabled={!account}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      account 
                        ? 'border-blue-200 focus:ring-blue-400 focus:border-blue-300 bg-white/80 backdrop-blur-sm' 
                        : 'border-gray-300 bg-gray-100 cursor-not-allowed'
                    }`}
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

            <div className="lg:w-80 space-y-6">
              {/* Instructions Modal */}
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-pointer">
                    <CometCard className="bg-white/95 backdrop-blur-sm border border-blue-200/50 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 p-4">
                        <img 
                          src="/game.png" 
                          alt="Game Instructions" 
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            How to Play
                          </h3>
                          <p className="text-xs text-gray-600">
                            Click to view game rules
                          </p>
                        </div>
                      </div>
                    </CometCard>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800 mb-4">
                      Rock Paper Scissors Lizard Spock
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <img 
                      src="/game.png" 
                      alt="Rock Paper Scissors Lizard Spock Rules" 
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <GameHistory onLoadGame={handleLoadGame} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}