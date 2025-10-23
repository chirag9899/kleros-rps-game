'use client';

import { useEffect, useState } from 'react';
import { useReadContract, useActiveWalletChain } from 'thirdweb/react';
import { getRPSContract } from '@/lib/thirdweb';
import CreateGame from './CreateGame';
import JoinGame from './JoinGame';
import RevealMove from './RevealMove';
import GameCompleted from './GameCompleted';
import GameInfo from './GameInfo';
import { Icon } from '@/components/ui/icons';

interface GamePlayProps {
  account: any;
  contractAddress: string;
  onGameCreated: (address: string) => void;
  onRefresh: () => void;
}

export default function GamePlay({
  account,
  contractAddress,
  onGameCreated,
  onRefresh,
}: GamePlayProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const activeChain = useActiveWalletChain();
  
  const contract = getRPSContract(contractAddress, activeChain?.id);

  const { data: player1, refetch: refetchPlayer1 } = useReadContract({
    contract,
    method: "function j1() external view returns (address)",
    params: [],
  });

  const { data: player2, refetch: refetchPlayer2 } = useReadContract({
    contract,
    method: "function j2() external view returns (address)",
    params: [],
  });

  const { data: c2Move, refetch: refetchC2 } = useReadContract({
    contract,
    method: "function c2() external view returns (uint8)",
    params: [],
  });

  const { data: stake, refetch: refetchStake } = useReadContract({
    contract,
    method: "function stake() external view returns (uint256)",
    params: [],
  });
  
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetchPlayer1();
      refetchPlayer2();
      refetchC2();
      refetchStake();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refetchPlayer1, refetchPlayer2, refetchC2, refetchStake]);
  
  const handleManualRefresh = () => {
    refetchPlayer1();
    refetchPlayer2();
    refetchC2();
    refetchStake();
  };

  const getGamePhase = () => {
    if (!account) return 'connect';
    
    const p1 = player1 as string | undefined;
    if (!p1 || p1 === '0x0000000000000000000000000000000000000000') {
      return 'create';
    }

    const c2 = c2Move ? Number(c2Move) : 0;
    const isPlayer1 = p1.toLowerCase() === account.address.toLowerCase();
    const p2 = player2 as string | undefined;
    const isPlayer2 = p2 && p2.toLowerCase() === account.address.toLowerCase();

    // game completed (stake is 0 after payout) - so checking this first!
    const stakeValue = stake ? BigInt(stake.toString()) : BigInt(0);
    if (stakeValue === BigInt(0)) {
      return 'completed';
    }

    if (c2 === 0) {
      if (isPlayer2 || (!isPlayer1 && !isPlayer2)) {
        return 'join';
      }
      return 'waiting_p2';
    }

    if (isPlayer1) {
      return 'reveal';
    }
    
    return 'waiting_reveal';
  };

  const phase = getGamePhase();
  
  const c2 = c2Move ? Number(c2Move) : 0;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between bg-gray-100 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
            >
              <Icon name="refresh" className="mr-1" />
              Refresh
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              Auto-refresh (5s)
            </label>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            Phase: {phase} | C2: {c2}
          </div>
        </div>
        {phase === 'connect' && (
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-bold mb-2 text-black">Welcome!</h2>
            <p className="text-gray-600">Please connect your wallet to start playing</p>
          </div>
        )}

        {phase === 'create' && (
          <CreateGame onGameCreated={onGameCreated} />
        )}

        {phase === 'join' && (
          <JoinGame
            contractAddress={contractAddress}
            onGameJoined={onRefresh}
          />
        )}

        {phase === 'reveal' && (
          <RevealMove
            contractAddress={contractAddress}
            onRevealed={onRefresh}
          />
        )}

        {phase === 'waiting_p2' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-black">Waiting...</h2>
              <p className="text-gray-600 mb-4">Waiting for Player 2 to join the game</p>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <p className="text-blue-900">
                  <strong>Player 2 address:</strong> {player2 as string || 'Not set'}
                </p>
                <p className="text-blue-900">
                  <strong>Player 2 move (c2):</strong> {c2 === 0 ? 'Not played yet' : `Played (${c2})`}
                </p>
              </div>
              <button
                onClick={handleManualRefresh}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                <Icon name="refresh" className="mr-1" />
                Check if Player 2 Joined
              </button>
            </div>
            <GameInfo contractAddress={contractAddress} onRefresh={onRefresh} />
          </div>
        )}

        {phase === 'waiting_reveal' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-black">Waiting...</h2>
              <p className="text-gray-600">Waiting for Player 1 to reveal their move</p>
            </div>
            <GameInfo contractAddress={contractAddress} onRefresh={onRefresh} />
          </div>
        )}

        {phase === 'completed' && (
          <GameCompleted
            contractAddress={contractAddress}
            account={account}
            onStartNew={() => {
              localStorage.removeItem('currentGameAddress');
              localStorage.removeItem('playerRole');
              localStorage.removeItem(`rps_salt_${contractAddress}_${account.address}`);
              localStorage.removeItem(`rps_move_${contractAddress}_${account.address}`);
              window.location.href = '/';
            }}
          />
        )}
      </div>
    </div>
  );
}

