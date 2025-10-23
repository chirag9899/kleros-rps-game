import { Icon } from '@/components/ui/icons';
import { MOVES, MOVE_NAMES } from '@/lib/contract';
import { PlayerCard } from './PlayerCard';

interface TimeoutDisplayProps {
  winnerResult: number;
  player2Move: number | null;
  j1Address: string;
  j2Address: string;
  account: any;
  contractAddress: string;
  activeChain: any;
  onStartNew: () => void;
}

export function TimeoutDisplay({
  winnerResult,
  player2Move,
  j1Address,
  j2Address,
  account,
  contractAddress,
  activeChain,
  onStartNew,
}: TimeoutDisplayProps) {
  const isPlayer1 = account?.address.toLowerCase() === j1Address.toLowerCase();
  const isPlayer2 = account?.address.toLowerCase() === j2Address.toLowerCase();

  const getTimeoutInfo = () => {
    if (winnerResult === 1) {
      if (isPlayer1) {
        return {
          title: 'Game Completed',
          subtitle: 'Opponent did not join within the timeout period. Your stake has been returned.',
          player1Move: null,
          player2Move: 0,
        };
      } else {
        return {
          title: 'Game Completed',
          subtitle: 'You did not join within the timeout period. Your stake was forfeited.',
          player1Move: null,
          player2Move: 0,
        };
      }
    } else if (winnerResult === 2) {
      if (isPlayer2) {
        return {
          title: 'Game Completed',
          subtitle: 'Opponent did not reveal their move within the timeout period. You received the full pot.',
          player1Move: null,
          player2Move: player2Move,
        };
      } else {
        return {
          title: 'Game Completed',
          subtitle: 'You did not reveal your move within the timeout period. Your stake was forfeited.',
          player1Move: null,
          player2Move: player2Move,
        };
      }
    }

    return {
      title: 'Game Completed',
      subtitle: 'Timeout resolution completed.',
      player1Move: null,
      player2Move: player2Move,
    };
  };

  const timeoutInfo = getTimeoutInfo();
  const getExplorerUrl = () => {
    return activeChain?.id === 11155111 
      ? 'https://sepolia.etherscan.io' 
      : 'https://amoy.polygonscan.com';
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-lg">
      <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
        {timeoutInfo.title}
      </h2>
      <p className="text-center text-gray-600 mb-4 text-lg">{timeoutInfo.subtitle}</p>
      
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          Timeout Resolution
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {winnerResult === 1 ? (
          <>
            <PlayerCard
              playerType="player1"
              address={j1Address}
              move={null}
              isWinner={true}
              isCurrentUser={isPlayer1}
              isTimeout={true}
            />
            <PlayerCard
              playerType="player2"
              address={j2Address}
              move={0}
              isWinner={false}
              isCurrentUser={isPlayer2}
              isTimeout={true}
            />
          </>
        ) : (
          <>
            <PlayerCard
              playerType="player1"
              address={j1Address}
              move={null}
              isWinner={false}
              isCurrentUser={isPlayer1}
              isTimeout={true}
            />
            <PlayerCard
              playerType="player2"
              address={j2Address}
              move={player2Move}
              isWinner={true}
              isCurrentUser={isPlayer2}
              isTimeout={true}
            />
          </>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 p-3 rounded mb-4 text-sm">
        <p className="text-gray-700">
          <strong>Contract:</strong>{' '}
          <a 
            href={`${getExplorerUrl()}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-mono"
          >
            {contractAddress}
          </a>
        </p>
        <p className="text-gray-700 mt-1">
          <strong>Status:</strong> Funds distributed
        </p>
      </div>

      <button
        onClick={onStartNew}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Start New Game
      </button>
    </div>
  );
}
