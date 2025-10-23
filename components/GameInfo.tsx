'use client';

import { useReadContract, useActiveAccount } from 'thirdweb/react';
import { getRPSContract } from '@/lib/thirdweb';
import { MOVE_NAMES, formatEth, determineWinner } from '@/lib/contract';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import { useState, useEffect } from 'react';

interface GameInfoProps {
  contractAddress: string;
  onRefresh: () => void;
}

export default function GameInfo({ contractAddress, onRefresh }: GameInfoProps) {
  const account = useActiveAccount();
  const contract = getRPSContract(contractAddress);
  const [timeoutAvailable, setTimeoutAvailable] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');

  const { data: player1 } = useReadContract({
    contract,
    method: "function j1() external view returns (address)",
    params: [],
  });

  const { data: player2 } = useReadContract({
    contract,
    method: "function j2() external view returns (address)",
    params: [],
  });

  const { data: c2Move } = useReadContract({
    contract,
    method: "function c2() external view returns (uint8)",
    params: [],
  });

  const { data: stake } = useReadContract({
    contract,
    method: "function stake() external view returns (uint256)",
    params: [],
  });

  const { data: lastAction } = useReadContract({
    contract,
    method: "function lastAction() external view returns (uint256)",
    params: [],
  });

  const { data: timeout } = useReadContract({
    contract,
    method: "function TIMEOUT() external view returns (uint256)",
    params: [],
  });

  useEffect(() => {
    if (lastAction && timeout) {
      const now = Math.floor(Date.now() / 1000);
      const timeoutTime = Number(lastAction) + Number(timeout);
      setTimeoutAvailable(now > timeoutTime);
    }
  }, [lastAction, timeout]);

  const handleTimeout = async (isJ1: boolean) => {
    if (!account) return;
    
    setIsClaiming(true);
    setError('');

    try {
      const method = isJ1 ? "function j1Timeout() external" : "function j2Timeout() external";
      
      const transaction = prepareContractCall({
        contract,
        method,
        params: [],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      onRefresh();
    } catch (err: any) {
      console.error('Error claiming timeout:', err);
      setError(err.message || 'Failed to claim timeout');
    } finally {
      setIsClaiming(false);
    }
  };

  const getGameState = () => {
    if (!player1 || player1 === '0x0000000000000000000000000000000000000000') {
      return { phase: 'no_game', message: 'No active game' };
    }

    const c2 = c2Move ? Number(c2Move) : 0;
    
    if (c2 === 0) {
      return { phase: 'waiting_p2', message: 'Waiting for Player 2 to join' };
    }

    if (c2 > 0 && stake && Number(stake) > 0) {
      return { phase: 'waiting_reveal', message: 'Waiting for Player 1 to reveal' };
    }

    return { phase: 'completed', message: 'Game completed' };
  };

  const state = getGameState();

  return (
    <div className="border rounded-lg p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">Game Status</h2>
      
      <div className="space-y-3">
        <div className="bg-gray-100 p-3 rounded text-black">
          <p className="text-sm font-medium mb-2">Game State: {state.message}</p>
          <p className="text-xs"><strong>Player 1:</strong> {player1 || 'None'}</p>
          <p className="text-xs"><strong>Player 2:</strong> {player2 || 'None'}</p>
          {c2Move && Number(c2Move) > 0 && (
            <p className="text-xs"><strong>Player 2 Move:</strong> {MOVE_NAMES[Number(c2Move)]}</p>
          )}
          <p className="text-xs"><strong>Stake:</strong> {stake ? formatEth(stake.toString()) : '0'} ETH</p>
        </div>

        {timeoutAvailable && state.phase !== 'completed' && (
          <div className="bg-yellow-100 border border-yellow-400 p-3 rounded text-black">
            <p className="text-sm font-medium mb-2">Timeout Available!</p>
            <div className="flex gap-2">
              {account && player1 && account.address.toLowerCase() === player1.toLowerCase() && (
                <button
                  onClick={() => handleTimeout(true)}
                  disabled={isClaiming}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm"
                >
                  Claim as P1
                </button>
              )}
              {account && player2 && account.address.toLowerCase() === player2.toLowerCase() && (
                <button
                  onClick={() => handleTimeout(false)}
                  disabled={isClaiming}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm"
                >
                  Claim as P2
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          onClick={onRefresh}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}

