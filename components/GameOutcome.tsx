import { Icon } from '@/components/ui/icons';
import { MOVE_NAMES } from '@/lib/contract';
import { PlayerCard } from './PlayerCard';

interface GameOutcomeProps {
  player1Move: number | null;
  player2Move: number | null;
  winnerResult: number;
  dataSource: 'localStorage' | 'blockchain' | 'timeout' | null;
  j1Address: string;
  j2Address: string;
  account: any;
  contractAddress: string;
  activeChain: any;
  onStartNew: () => void;
  onRefresh?: () => void;
  retryCount?: number;
  isRetrying?: boolean;
}

export function GameOutcome({
  player1Move,
  player2Move,
  winnerResult,
  dataSource,
  j1Address,
  j2Address,
  account,
  contractAddress,
  activeChain,
  onStartNew,
  onRefresh,
  retryCount = 0,
  isRetrying = false,
}: GameOutcomeProps) {
  const isPlayer1 = account?.address.toLowerCase() === j1Address.toLowerCase();
  const isPlayer2 = account?.address.toLowerCase() === j2Address.toLowerCase();

  const getOutcomeInfo = () => {
    if (dataSource === 'timeout') {
      if (winnerResult === 1) {
        return {
          title: 'Game Completed',
          subtitle: 'Opponent did not join within the timeout period. Your stake has been returned.',
          emoji: '',
          color: 'text-gray-800',
        };
      } else if (winnerResult === 2) {
        return {
          title: 'Game Completed',
          subtitle: 'Opponent did not reveal their move within the timeout period. You received the full pot.',
          emoji: '',
          color: 'text-gray-800',
        };
      }
    }

    if (winnerResult === 0) {
      return {
        title: "It's a Tie!",
        subtitle: `Both players chose ${MOVE_NAMES[player1Move!]}. The stake has been split.`,
        emoji: '',
        color: 'text-yellow-600',
      };
    } else if (winnerResult === 1) {
      const won = isPlayer1;
      return {
        title: won ? 'You Won!' : 'You Lost!',
        subtitle: won 
          ? `${MOVE_NAMES[player1Move!]} beats ${MOVE_NAMES[player2Move!]}. You received the stake!`
          : `${MOVE_NAMES[player1Move!]} beats ${MOVE_NAMES[player2Move!]}. Player 1 wins!`,
        emoji: '',
        color: won ? 'text-green-600' : 'text-red-600',
      };
    } else if (winnerResult === 2) {
      const won = isPlayer2;
      return {
        title: won ? 'You Won!' : 'You Lost!',
        subtitle: won
          ? `${MOVE_NAMES[player2Move!]} beats ${MOVE_NAMES[player1Move!]}. You received the stake!`
          : `${MOVE_NAMES[player2Move!]} beats ${MOVE_NAMES[player1Move!]}. Player 2 wins!`,
        emoji: '',
        color: won ? 'text-green-600' : 'text-red-600',
      };
    }

    return {
      title: 'Game Completed',
      subtitle: 'Result determined from blockchain transactions.',
      emoji: '',
      color: 'text-gray-800',
    };
  };

  const outcome = getOutcomeInfo();

  const getDataSourceBadge = () => {
    if (!dataSource) return null;

    const badges = {
      localStorage: { text: '💾 Loaded from Your Browser', class: 'bg-blue-100 text-blue-800' },
      blockchain: { text: '⛓️ Calculated from Blockchain', class: 'bg-purple-100 text-purple-800' },
            timeout: { text: 'Timeout Resolution', class: 'bg-orange-100 text-orange-800' },
    };

    const badge = badges[dataSource];
    return (
      <div className="text-center mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.class}`}>
          {badge.text}
        </span>
      </div>
    );
  };

  const getExplorerUrl = () => {
    return activeChain?.id === 11155111 
      ? 'https://sepolia.etherscan.io' 
      : 'https://amoy.polygonscan.com';
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-lg">
      <h2 className={`text-4xl font-bold mb-2 text-center ${outcome.color}`}>
        {outcome.emoji} {outcome.title}
      </h2>
      <p className="text-center text-gray-700 mb-4 text-lg">{outcome.subtitle}</p>
      
      {getDataSourceBadge()}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <PlayerCard
          playerType="player1"
          address={j1Address}
          move={player1Move}
          isWinner={winnerResult === 1}
          isCurrentUser={isPlayer1}
          isTimeout={dataSource === 'timeout'}
        />
        <PlayerCard
          playerType="player2"
          address={j2Address}
          move={player2Move}
          isWinner={winnerResult === 2}
          isCurrentUser={isPlayer2}
          isTimeout={dataSource === 'timeout'}
        />
      </div>

      {onRefresh && (
        <div className="text-center mb-4">
          <button
            onClick={onRefresh}
            disabled={isRetrying}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {isRetrying ? '🔄 Refreshing...' : '🔄 Refresh Results'}
          </button>
          {retryCount > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {retryCount < 4 ? `Auto-retry ${retryCount}/4 - waiting for blockchain to index...` : 'Showing partial results'}
            </p>
          )}
        </div>
      )}

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
          <strong>Status:</strong> Funds distributed ✅
        </p>
        <p className="text-gray-700 mt-2">
          <a 
            href={`${getExplorerUrl()}/address/${contractAddress}#internaltx`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs"
          >
            📊 View transaction history →
          </a>
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
