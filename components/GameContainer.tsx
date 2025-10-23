'use client';

import { useState, useEffect } from 'react';
import CreateGame from './CreateGame';
import GamePlay from './GamePlay';

interface GameContainerProps {
  account: any;
  contractAddress: string;
  refreshKey: number;
  onGameCreated: (address: string) => void;
  onRefresh: () => void;
}

export default function GameContainer({
  account,
  contractAddress,
  refreshKey,
  onGameCreated,
  onRefresh,
}: GameContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="border rounded-lg p-6 bg-white">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  if (!contractAddress || !isValidAddress(contractAddress)) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          {!account ? (
            <div className="border rounded-lg p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-black">Welcome!</h2>
              <p className="text-gray-600">Please connect your wallet to start playing</p>
            </div>
          ) : (
            <div className="border rounded-lg p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-black">No Active Game</h2>
              <p className="text-gray-600 mb-4">
                {contractAddress && !isValidAddress(contractAddress) 
                  ? '⚠️ Invalid contract address. Please enter a valid Ethereum address.'
                  : 'Enter a contract address above to join a game, or create a new one'}
              </p>
              {(!contractAddress || !isValidAddress(contractAddress)) && (
                <CreateGame onGameCreated={onGameCreated} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <GamePlay
      account={account}
      contractAddress={contractAddress}
      onGameCreated={onGameCreated}
      onRefresh={onRefresh}
    />
  );
}
