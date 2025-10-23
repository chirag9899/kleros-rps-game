import { Icon } from '@/components/ui/icons';
import { MOVES, MOVE_NAMES } from '@/lib/contract';

interface PlayerCardProps {
  playerType: 'player1' | 'player2';
  address: string;
  move: number | null;
  isWinner: boolean;
  isCurrentUser: boolean;
  isTimeout?: boolean;
}

export function PlayerCard({ 
  playerType, 
  address, 
  move, 
  isWinner, 
  isCurrentUser, 
  isTimeout = false 
}: PlayerCardProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getCardStyles = () => {
    if (isTimeout) {
      return 'border-2 p-4 rounded-lg text-center bg-gray-100 border-gray-300';
    }
    
    if (isWinner) {
      return 'border-2 p-4 rounded-lg text-center bg-green-50 border-green-500';
    }
    
    return 'border-2 p-4 rounded-lg text-center bg-gray-50 border-gray-300';
  };

  const getPlayerLabel = () => {
    const role = playerType === 'player1' ? 'Player 1' : 'Player 2';
    return isCurrentUser ? `You (${role})` : `Opponent (${role})`;
  };

  const renderMove = () => {
    if (move === null) {
      return (
        <>
          <div className="text-4xl mb-2">
            <Icon name="info" className="text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-500">Unknown</p>
        </>
      );
    }

    if (move === 0 && isTimeout) {
      return (
        <>
          <div className="text-4xl mb-2">
            <Icon name="times" className="text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-500">Never Played</p>
        </>
      );
    }

    return (
      <>
        <div className="text-4xl mb-2">
          {move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
          {move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
          {move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
          {move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
          {move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
        </div>
        <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[move]}</p>
      </>
    );
  };

  return (
    <div className={getCardStyles()}>
      <p className="text-xs font-semibold mb-1 flex items-center">
        {getPlayerLabel()}
        {isWinner && <Icon name="trophy" className="ml-1" />}
      </p>
      <p className="text-sm text-gray-700 mb-2 font-mono">
        {formatAddress(address)}
      </p>
      {renderMove()}
    </div>
  );
}
