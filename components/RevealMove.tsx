'use client';

import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import { getRPSContract } from '@/lib/thirdweb';
import { updateGameStatus } from '@/lib/game-history';
import { getSalt, clearSalt, MOVE_NAMES } from '@/lib/contract';
import { Icon } from '@/components/ui/icons';

interface RevealMoveProps {
  contractAddress: string;
  onRevealed: () => void;
}

export default function RevealMove({ contractAddress, onRevealed }: RevealMoveProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState('');
  const [storedMove, setStoredMove] = useState<number | null>(null);

  useEffect(() => {
    if (!account) return;
    
    let moveStr = localStorage.getItem(`rps_move_${contractAddress}_${account.address}`);
    
    if (!moveStr) {
      moveStr = localStorage.getItem(`rps_move_pending_${account.address}`);
    }
    
    if (!moveStr) {
      const lastContract = localStorage.getItem('rps_last_game_contract');
      const lastPlayer = localStorage.getItem('rps_last_game_player');
      
      if (lastContract?.toLowerCase() === contractAddress.toLowerCase() && 
          lastPlayer?.toLowerCase() === account.address.toLowerCase()) {
        moveStr = localStorage.getItem('rps_last_game_move');
        
        if (moveStr) {
          localStorage.setItem(`rps_move_${contractAddress}_${account.address}`, moveStr);
          const salt = localStorage.getItem('rps_last_game_salt');
          if (salt) {
            localStorage.setItem(`rps_salt_${contractAddress}_${account.address}`, salt);
          }
        }
      }
    }
    
    if (moveStr) {
      setStoredMove(parseInt(moveStr));
    } else {
      console.error('❌ No move found in localStorage!');
    }
  }, [contractAddress, account]);

  const handleReveal = async () => {
    if (!account) {
      setError('Please connect wallet');
      return;
    }

    if (!storedMove) {
      setError('Original move not found! Cannot reveal.');
      return;
    }

    // get salt from localStorage - checking both actual contract and pending
    let salt = getSalt(contractAddress, account.address);
    if (!salt) {
      salt = getSalt('pending', account.address);
    }
    
    if (!salt) {
      const lastContract = localStorage.getItem('rps_last_game_contract');
      const lastPlayer = localStorage.getItem('rps_last_game_player');
      
      if (lastContract?.toLowerCase() === contractAddress.toLowerCase() && 
          lastPlayer?.toLowerCase() === account.address.toLowerCase()) {
        salt = localStorage.getItem('rps_last_game_salt') || '';
      }
    }
    
    if (!salt) {
      setError('Salt not found! Did you clear browser data?');
      console.error('❌ Salt not found. Checked keys:', `rps_salt_${contractAddress}_${account.address}`, `rps_salt_pending_${account.address}`, 'rps_last_game_salt');
      return;
    }

    const move = storedMove;
    
    setError('');
    setIsRevealing(true);

    try {
      const contract = getRPSContract(contractAddress, activeChain?.id);
      
      const { readContract } = await import('thirdweb');
      const { formatEth } = await import('@/lib/contract');
      let player2Move: number | null = null;
      let player1Address = '';
      let player2Address = '';
      let stakeAmount = '';
      
      try {
        const c2Move = await readContract({
          contract,
          method: "function c2() external view returns (uint8)",
          params: [],
        });
        player2Move = Number(c2Move);
        
        // j1- player 1 , j2- player 2 address
        const j1 = await readContract({
          contract,
          method: "function j1() external view returns (address)",
          params: [],
        });
        player1Address = j1 as string;
        
        const j2 = await readContract({
          contract,
          method: "function j2() external view returns (address)",
          params: [],
        });
        player2Address = j2 as string;
        
        const stakeRaw = await readContract({
          contract,
          method: "function stake() external view returns (uint256)",
          params: [],
        });
        stakeAmount = formatEth(stakeRaw.toString());
      } catch (readErr) {
        console.error('⚠️ Could not read game data:', readErr);
      }
      
      // get current gas price and increase for faster confirmation
      const { ethers } = await import('ethers');
      const provider = new ethers.providers.JsonRpcProvider(
        'https://rpc-amoy.polygon.technology/'
      );
      const gasPrice = await provider.getGasPrice();
      const increasedGasPrice = gasPrice.mul(150).div(100); // 1.5x gas price
      
      const transaction = prepareContractCall({
        contract,
        method: "function solve(uint8 _c1, uint256 _salt) external",
        params: [move, BigInt(salt)],
        gas: BigInt(200000), // Sufficient gas for solve()
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
      
      if (player2Move !== null) {
      }
      
      clearSalt(contractAddress, account.address);
      clearSalt('pending', account.address);
      localStorage.removeItem(`rps_move_${contractAddress}_${account.address}`);
      localStorage.removeItem(`rps_move_pending_${account.address}`);
      
      updateGameStatus(contractAddress, 'completed');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      onRevealed();
    } catch (err: any) {
      console.error('Error revealing:', err);
      if (err.code === 4001) {
        setError('Transaction rejected');
      } else {
        setError(err.message || 'Failed to reveal');
      }
      setIsRevealing(false); // Only clear on error
    }
  };

  return (
    <div className="border rounded-lg p-6 max-w-md bg-white">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Reveal Your Move</h2>
      
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 p-3 rounded">
          <p className="text-sm text-purple-900">
            <Icon name="game" className="mr-1" />
            Player 2 has made their move. Time to reveal your choice!
          </p>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs font-mono">
          <p className="text-gray-700"><strong>Contract:</strong> {contractAddress}</p>
          <p className="text-gray-700"><strong>Your address:</strong> {account?.address}</p>
          <p className="text-gray-700"><strong>Stored move:</strong> {storedMove !== null ? MOVE_NAMES[storedMove] : 'NOT FOUND'}</p>
        </div>

        {storedMove !== null && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
            <p className="text-sm text-blue-900">
              <strong>Your move:</strong> {MOVE_NAMES[storedMove]}
            </p>
          </div>
        )}
        
        {storedMove === null && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
            <p className="text-sm text-yellow-900 mb-3">
              <Icon name="warning" className="mr-1" />
              Move not found in browser storage.
            </p>
            
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-semibold">Show all localStorage keys</summary>
              <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded border">
                {JSON.stringify(Object.keys(localStorage).filter(k => k.includes('rps')), null, 2)}
              </pre>
            </details>
            
            <div className="text-xs space-y-2 bg-white p-3 rounded border border-yellow-300">
              <p className="font-semibold">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Different browser/tab than where you created the game</li>
                <li>Browser storage was cleared</li>
                <li>Incognito/private mode</li>
              </ul>
              
              <p className="font-semibold mt-3">Options:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>Wait 5 minutes:</strong> Then you can claim timeout refund (j2Timeout)</li>
                <li><strong>Manual recovery:</strong> If you remember your move and have the salt, add it manually via console</li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleReveal}
          disabled={isRevealing || storedMove === null}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          {isRevealing ? (
            <>
              <Icon name="spinner" className="animate-spin mr-1" />
              Processing... Please wait
            </>
          ) : storedMove === null ? (
            <>
              <Icon name="times" className="mr-1" />
              Cannot Reveal (Move Not Found)
            </>
          ) : (
            <>
              <Icon name="game" className="mr-1" />
              Reveal Move
            </>
          )}
        </button>
        
        {storedMove === null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900 font-semibold mb-2">
              Alternative: Claim Timeout
            </p>
            <p className="text-xs text-blue-800 mb-3">
              If you can't reveal your move, wait 5 minutes from when Player 2 joined, then you can claim a timeout refund using j2Timeout function.
            </p>
            <p className="text-xs text-gray-600">
              You'll need to call the contract directly or use a timeout button if available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

