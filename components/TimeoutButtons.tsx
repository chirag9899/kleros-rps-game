'use client';

import { useState } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { prepareContractCall, sendTransaction } from 'thirdweb';
import { getRPSContract } from '@/lib/thirdweb';
import { Icon } from '@/components/ui/icons';

interface TimeoutButtonsProps {
  contractAddress: string;
  onSuccess: () => void;
}

export default function TimeoutButtons({ contractAddress, onSuccess }: TimeoutButtonsProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleJ1Timeout = async () => {
    if (!account) {
      setError('Please connect wallet');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const contract = getRPSContract(contractAddress, activeChain?.id);
      
      const transaction = prepareContractCall({
        contract,
        method: "function j1Timeout() external",
        params: [],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      alert('Timeout claimed! You have been refunded.');
      onSuccess();
    } catch (err: any) {
      console.error('error claiming timeout:', err);
      if (err.message?.includes('Timeout time has not passed')) {
        setError('Timeout period (5 minutes) has not passed yet. Please wait.');
      } else {
        setError(err.message || 'Failed to claim timeout');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJ2Timeout = async () => {
    if (!account) {
      setError('Please connect wallet');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const contract = getRPSContract(contractAddress, activeChain?.id);
      
      const transaction = prepareContractCall({
        contract,
        method: "function j2Timeout() external",
        params: [],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      alert('Timeout claimed! Funds transferred.');
      onSuccess();
    } catch (err: any) {
      console.error('Error claiming timeout:', err);
      if (err.message?.includes('Timeout time has not passed')) {
        setError('⏱ Timeout period (5 minutes) has not passed yet. Please wait.');
      } else {
        setError(err.message || 'Failed to claim timeout');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 max-w-md bg-white">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Claim Timeout</h2>
      
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 p-3 rounded">
          <p className="text-sm text-orange-900">
            ⏱ If the other player hasn't responded, you can claim timeout after 5 minutes.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJ1Timeout}
            disabled={isProcessing}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {isProcessing ? (
              <>
                <Icon name="spinner" className="animate-spin mr-1" />
                Processing...
              </>
            ) : (
              <>
                <Icon name="clock" className="mr-1" />
                Claim as Player 1 (j1Timeout)
              </>
            )}
          </button>
          
          <button
            onClick={handleJ2Timeout}
            disabled={isProcessing}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {isProcessing ? (
              <>
                <Icon name="spinner" className="animate-spin mr-1" />
                Processing...
              </>
            ) : (
              <>
                <Icon name="clock" className="mr-1" />
                Claim as Player 2 (j2Timeout)
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Use j1Timeout if Player 2 never joined. Use j2Timeout if Player 1 hasn't revealed.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

