'use client';

import { useState, useEffect } from 'react';
import { useActiveAccount, useReadContract, useActiveWalletChain } from 'thirdweb/react';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import { getRPSContract } from '@/lib/thirdweb';
import { addGameToHistory, updateGameStatus } from '@/lib/game-history';
import { MOVES, MOVE_NAMES, parseEth, formatEth } from '@/lib/contract';
import { ethers } from 'ethers';
import { Icon } from '@/components/ui/icons';

interface JoinGameProps {
  contractAddress: string;
  onGameJoined: () => void;
}

export default function JoinGame({ contractAddress, onGameJoined }: JoinGameProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [selectedMove, setSelectedMove] = useState(MOVES.ROCK);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  
  const contract = getRPSContract(contractAddress, activeChain?.id);
  
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
  
  const { data: stake } = useReadContract({
    contract,
    method: "function stake() external view returns (uint256)",
    params: [],
  });

  const handleJoinGame = async () => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!stake) {
      setError('Unable to read stake amount');
      return;
    }

    if (player2 && player2.toLowerCase() !== account.address.toLowerCase()) {
      setError('You are not player 2 for this game');
      return;
    }

    if (selectedMove < 1 || selectedMove > 5) {
      setError('Invalid move');
      return;
    }

    const capturedStake = stake;
    const stakeForHistory = formatEth(capturedStake.toString());

    setError('');
    setIsJoining(true);

    try {

      const provider = new ethers.providers.JsonRpcProvider(
        'https://rpc-amoy.polygon.technology/'
      );
      const gasPrice = await provider.getGasPrice();
      const increasedGasPrice = gasPrice.mul(150).div(100);
      
      const transaction = prepareContractCall({
        contract,
        method: "function play(uint8 _c2) external payable",
        params: [selectedMove],
        value: capturedStake,
        gas: BigInt(200000),
        gasPrice: BigInt(increasedGasPrice.toString()),
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60;
      
      while (!receipt && attempts < maxAttempts) {
        attempts++;
        
        try {
          receipt = await provider.getTransactionReceipt(result.transactionHash);
          if (receipt) {
            break;
          }
        } catch (e) {}
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!receipt) {
        throw new Error('Transaction was not mined in time. Check PolygonScan for status.');
      }
      
      localStorage.setItem('playerRole', 'player2');
      
      addGameToHistory({
        contractAddress,
        role: 'player2',
        opponent: player1 as string,
        stake: stakeForHistory,
        status: 'joined',
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      onGameJoined();
    } catch (err: any) {
      console.error('Error joining game:', err);
      if (err.code === 4001) {
        setError('Transaction rejected');
      } else {
        setError(err.message || 'Failed to join game');
      }
      setIsJoining(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 max-w-md bg-white">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Join Game</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
          <p className="text-blue-900"><strong>Player 1:</strong> {player1 || 'Loading...'}</p>
          <p className="text-blue-900"><strong>Player 2:</strong> {player2 || 'Loading...'}</p>
          <p className="text-blue-900"><strong>Stake:</strong> {stake ? formatEth(stake.toString()) : '0'} MATIC</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900">
            Select Your Move
          </label>
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {[MOVES.ROCK, MOVES.PAPER, MOVES.SCISSORS, MOVES.SPOCK, MOVES.LIZARD].map((move) => (
              <label 
                key={move} 
                className={`flex items-center gap-3 cursor-pointer p-2 rounded transition-colors ${
                  selectedMove === move 
                    ? 'bg-blue-100 border-2 border-blue-500' 
                    : 'bg-white border-2 border-gray-300 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="move"
                  value={move}
                  checked={selectedMove === move}
                  onChange={() => setSelectedMove(move)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-900 font-medium">{MOVE_NAMES[move]}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleJoinGame}
          disabled={isJoining}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded"
        >
          {isJoining ? (
            <>
              <Icon name="spinner" className="animate-spin mr-1" />
              Processing... Please wait
            </>
          ) : (
            `Join Game (${stake ? formatEth(stake.toString()) : '0'} MATIC)`
          )}
        </button>
      </div>
    </div>
  );
}

