'use client';

import { useActiveWalletChain } from 'thirdweb/react';
import { useGameData } from '@/hooks/useGameData';
import { GameOutcome } from './GameOutcome';
import { TimeoutDisplay } from './TimeoutDisplay';
import { Icon } from '@/components/ui/icons';

interface GameCompletedProps {
  contractAddress: string;
  account: any;
  onStartNew: () => void;
}

export default function GameCompleted({ contractAddress, account, onStartNew }: GameCompletedProps) {
  const activeChain = useActiveWalletChain();
  const gameData = useGameData(contractAddress, account);

  if (gameData.loading) {
    return (
      <div className="border rounded-lg p-6 bg-white text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Game Completed</h2>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">
            {gameData.retryCount > 0 ? `Retrying... (attempt ${gameData.retryCount + 1})` : 'Loading game results from blockchain...'}
          </p>
        </div>
        <p className="text-xs text-gray-500 font-mono mb-2">Contract: {contractAddress}</p>
        {gameData.retryCount > 0 && (
          <p className="text-xs text-blue-600 mb-2">
            <Icon name="clock" className="mr-1" />
            Waiting for blockchain to index transaction data...
          </p>
        )}
      </div>
    );
  }

  if (gameData.player1Move === null && gameData.player2Move === null && gameData.winnerResult === null) {
    return (
      <div className="border rounded-lg p-6 bg-white text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Game Completed</h2>
        <p className="text-gray-600">Unable to load full game results</p>
        <button
          onClick={onStartNew}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Start New Game
        </button>
      </div>
    );
  }

  if (gameData.dataSource === 'timeout') {
    return (
      <TimeoutDisplay
        winnerResult={gameData.winnerResult!}
        player2Move={gameData.player2Move}
        j1Address={gameData.j1Address!}
        j2Address={gameData.j2Address!}
        account={account}
        contractAddress={contractAddress}
        activeChain={activeChain}
        onStartNew={onStartNew}
      />
    );
  }

  return (
    <GameOutcome
      player1Move={gameData.player1Move}
      player2Move={gameData.player2Move}
      winnerResult={gameData.winnerResult!}
      dataSource={gameData.dataSource}
      j1Address={gameData.j1Address!}
      j2Address={gameData.j2Address!}
      account={account}
      contractAddress={contractAddress}
      activeChain={activeChain}
      onStartNew={onStartNew}
      onRefresh={gameData.handleRefresh}
      retryCount={gameData.retryCount}
      isRetrying={gameData.isRetrying}
    />
  );
}

