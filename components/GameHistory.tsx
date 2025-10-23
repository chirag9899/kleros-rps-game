'use client';

import { useState, useEffect } from 'react';
import { 
  getGameHistory, 
  clearGameHistory, 
  formatTimestamp, 
  formatAddress,
  type GameHistory as GameHistoryType 
} from '@/lib/game-history';
import { Icon } from '@/components/ui/icons';
import { formatEth } from '@/lib/contract';

interface GameHistoryProps {
  onLoadGame: (contractAddress: string) => void;
  currentAddress?: string;
}

export default function GameHistory({ onLoadGame, currentAddress }: GameHistoryProps) {
  const [history, setHistory] = useState<GameHistoryType[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const games = getGameHistory();
    setHistory(games);
  };

  const handleClear = () => {
    if (confirm('Clear all game history?')) {
      clearGameHistory();
      setHistory([]);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'timeout':
        return 'text-orange-500';
      case 'revealed':
        return 'text-blue-500';
      case 'joined':
        return 'text-yellow-500';
      case 'created':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Done';
      case 'timeout':
        return 'Timeout';
      case 'revealed':
        return 'Revealed';
      case 'joined':
        return 'Joined';
      case 'created':
        return 'Created';
      default:
        return 'Unknown';
    }
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-blue-200/50">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-pink-50/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Icon name="copy" className="text-xl text-pink-600" />
            <h2 className="text-lg font-bold text-gray-800">
              Game History
            </h2>
            <span className="text-sm text-gray-600">
              ({history.length} game{history.length !== 1 ? 's' : ''})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="px-3 py-1 text-sm bg-pink-500 hover:bg-pink-600 text-white rounded transition-colors"
              >
                Clear
              </button>
            )}
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-blue-200/50">
            <div className="max-h-96 overflow-y-auto">
              {history.map((game, index) => (
                <div
                  key={game.contractAddress}
                  className={`p-4 border-b border-blue-200/30 last:border-b-0 hover:bg-blue-50/50 transition-colors ${
                    currentAddress?.toLowerCase() === game.contractAddress.toLowerCase()
                      ? 'bg-blue-100/50 border-l-4 border-l-blue-400'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-800">
                          {game.role === 'player1' ? (
                            <>
                              <Icon name="game" className="mr-1 text-pink-600" />
                              Creator
                            </>
                          ) : (
                            <>
                              <Icon name="game" className="mr-1 text-blue-600" />
                              Challenger
                            </>
                          )}
                        </span>
                        <span className={`text-sm ${getStatusColor(game.status)}`}>
                          {getStatusText(game.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Contract:</span>
                          <code className="text-blue-600 font-mono text-xs">
                            {formatAddress(game.contractAddress)}
                          </code>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Opponent:</span>
                          <code className="text-pink-600 font-mono text-xs">
                            {formatAddress(game.opponent)}
                          </code>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Stake:</span>
                            <span className="text-green-600 font-semibold">
                              {formatEth(game.stake)} MATIC
                            </span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            {formatTimestamp(game.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onLoadGame(game.contractAddress)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors flex-shrink-0"
                    >
                      Load Game
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

