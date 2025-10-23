'use client';

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { sendTransaction, prepareTransaction } from 'thirdweb';
import { client, chain } from '@/lib/thirdweb';
import { RPS_ABI } from '@/lib/contract';
import { RPS_BYTECODE } from '@/lib/rps-bytecode';
import { verifyContract } from '@/lib/verify-contract';
import { addGameToHistory } from '@/lib/game-history';
import { 
  generateSalt, 
  computeHash, 
  storeSalt, 
  MOVES, 
  MOVE_NAMES,
  parseEth 
} from '@/lib/contract';
import { ethers } from 'ethers';
import { Icon } from '@/components/ui/icons';

interface CreateGameProps {
  onGameCreated: (newContractAddress: string) => void;
}

export default function CreateGame({ onGameCreated }: CreateGameProps) {
  const account = useActiveAccount();
  const [opponent, setOpponent] = useState('');
  const [stakeAmount, setStakeAmount] = useState('0.001');
  const [selectedMove, setSelectedMove] = useState(MOVES.ROCK);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  const handleCreateGame = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    if (!ethers.utils.isAddress(opponent)) {
      setError('Invalid opponent address');
      return;
    }

    if (opponent.toLowerCase() === account.address.toLowerCase()) {
      setError("You can't play against yourself");
      return;
    }

    const stake = parseEth(stakeAmount);
    if (stake.lte(0)) {
      setError('Stake must be greater than 0');
      return;
    }

    if (selectedMove < 1 || selectedMove > 5) {
      setError('Invalid move selected');
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      // generate salt and compute hash
      const salt = generateSalt();
      const hash = computeHash(selectedMove, salt);
      
      const abiCoder = new ethers.utils.AbiCoder();
      const constructorParams = abiCoder.encode(
        ['bytes32', 'address'],
        [hash, opponent]
      );
      
      const deploymentData = RPS_BYTECODE + constructorParams.slice(2);
      
      const provider = new ethers.providers.JsonRpcProvider(
        'https://rpc-amoy.polygon.technology/'
      );
      const gasPrice = await provider.getGasPrice();
      const increasedGasPrice = gasPrice.mul(150).div(100);
      
      const balance = await provider.getBalance(account.address);
      
      const estimatedGasCost = increasedGasPrice.mul(3000000);
      const totalRequired = stake.add(estimatedGasCost);
      
      if (balance.lt(totalRequired)) {
        throw new Error(
          `Insufficient funds! You need ${ethers.utils.formatEther(totalRequired)} MATIC but only have ${ethers.utils.formatEther(balance)} MATIC. Get more test MATIC from: https://faucet.polygon.technology/`
        );
      }
      
      const deployTx = prepareTransaction({
        to: null as any,
        data: deploymentData as `0x${string}`,
        value: BigInt(stake.toString()),
        chain,
        client,
        gas: BigInt(5000000),
        gasPrice: BigInt(increasedGasPrice.toString()),
      });
      
      const result = await sendTransaction({
        transaction: deployTx,
        account,
      });
      
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 90;
      
      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        receipt = await provider.getTransactionReceipt(result.transactionHash);
        attempts++;
      }
      
      if (!receipt || !receipt.contractAddress) {
        throw new Error('Contract deployment failed - no address in receipt after waiting');
      }
      
      const contractAddress = receipt.contractAddress;
      
      storeSalt(contractAddress, account.address, salt);
      localStorage.setItem(`rps_move_${contractAddress}_${account.address}`, selectedMove.toString());
      localStorage.setItem('currentGameAddress', contractAddress);
      localStorage.setItem('playerRole', 'player1');
      
      addGameToHistory({
        contractAddress,
        role: 'player1',
        opponent,
        stake: stake.toString(),
        status: 'created',
      });
      
      startVerificationWithRetry(contractAddress, constructorParams.slice(2));
      
      alert(`Game created successfully!\n\nContract Address: ${contractAddress}\n\nYour move is saved. Wait for your opponent to join!`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onGameCreated(contractAddress);
      
    } catch (err: any) {
      console.error('Error creating game:', err);
      
      let errorMessage = err.message || 'Failed to create game';
      
      if (err.code === -32603) {
        errorMessage = 'Transaction failed. This usually means:\n\n' +
          '1. Insufficient funds for gas fees\n' +
          '2. Network congestion (try again)\n' +
          '3. MetaMask connection issue\n\n' +
          'Try:\n' +
          '• Get test MATIC from: https://faucet.polygon.technology/\n' +
          '• Lower the stake amount\n' +
          '• Wait a few seconds and try again';
      } else if (err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds!\n\n' +
          'Get test MATIC from: https://faucet.polygon.technology/';
      }
      
      setError(errorMessage);
      alert(errorMessage);
      setIsCreating(false); 
    }
  };

  const startVerificationWithRetry = (contractAddress: string, constructorArgs: string) => {
    (async () => {
      setVerificationStatus('Starting verification in background...');
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setVerificationStatus(`Background verification attempt ${attempt}/3...`);
          
          const result = await verifyContract(contractAddress, constructorArgs);
          
          if (result.status === 'success' || result.status === 'Pending') {
            setVerificationStatus('Verification submitted successfully!');
            return;
          } else if (result.status === 'retry_needed') {
            if (attempt < 3) {
              setVerificationStatus(`Contract not indexed yet. Retrying in 30s... (${attempt + 1}/3)`);
              await new Promise(resolve => setTimeout(resolve, 30000));
              continue;
            } else {
              setVerificationStatus('Verification failed after 3 attempts. You can verify manually on PolygonScan.');
              return;
            }
          } else {
            setVerificationStatus(`Verification failed: ${result.message}`);
            return;
          }
        } catch (err: any) {
          if (attempt < 3) {
            setVerificationStatus(`Attempt ${attempt} failed. Retrying in 30s...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else {
            setVerificationStatus(`Verification failed after 3 attempts: ${err.message}`);
          }
        }
      }
    })();
  };

  return (
    <div className="border rounded-lg p-6 max-w-md bg-white">
      <h2 className="text-2xl font-bold mb-4 text-black">Create New Game</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
          <p className="text-blue-800">
            <strong>Creating a game will deploy a new contract on Amoy testnet.</strong><br/>
            Make sure you have enough MATIC for gas + stake.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Opponent Address
          </label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">
            Stake Amount (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900">
            Your Move (will be hidden)
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

        {verificationStatus && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <Icon name="spinner" className="animate-spin text-blue-600" />
              <strong>Contract Verification:</strong>
            </div>
            <div className="mt-1">{verificationStatus}</div>
          </div>
        )}

        <button
          onClick={handleCreateGame}
          disabled={isCreating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded"
        >
          {isCreating ? 'Deploying Contract...' : 'Create Game & Deploy Contract'}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Your move will be stored locally. Don't clear browser data before revealing!
        </p>
      </div>
    </div>
  );
}
