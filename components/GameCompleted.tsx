'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'thirdweb/react';
import { getRPSContract } from '@/lib/thirdweb';
import { MOVES, MOVE_NAMES, determineWinner } from '@/lib/contract';
import { getGameResult } from '@/lib/game-result';
import { Icon } from '@/components/ui/icons';

interface GameCompletedProps {
  contractAddress: string;
  account: any;
  onStartNew: () => void;
}

export default function GameCompleted({ contractAddress, account, onStartNew }: GameCompletedProps) {
  const [player1Move, setPlayer1Move] = useState<number | null>(null);
  const [player2Move, setPlayer2Move] = useState<number | null>(null);
  const [winnerResult, setWinnerResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [winnerAddress, setWinnerAddress] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'localStorage' | 'blockchain' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const contract = getRPSContract(contractAddress);

  const { data: j1Address } = useReadContract({
    contract,
    method: "function j1() external view returns (address)",
    params: [],
  });

  const { data: j2Address } = useReadContract({
    contract,
    method: "function j2() external view returns (address)",
    params: [],
  });

  const { data: c2MoveData } = useReadContract({
    contract,
    method: "function c2() external view returns (uint8)",
    params: [],
  });

  const handleRefresh = async () => {
    setIsRetrying(true);
    setLoading(true);
    setRetryCount(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };
  
  useEffect(() => {
    const loadGameData = async () => {
      if (c2MoveData === undefined || !j1Address || !j2Address) {
        return;
      }

      const storedResult = getGameResult(contractAddress);
      if (storedResult) {
        setPlayer1Move(storedResult.player1Move);
        setPlayer2Move(storedResult.player2Move);
        const winner = storedResult.winner === 'player1' ? 1 : 
                       storedResult.winner === 'player2' ? 2 : 0;
        setWinnerResult(winner);
        setDataSource('localStorage');
        setLoading(false);
        return;
      }
      
      const p2Move = Number(c2MoveData);
      const p1Addr = (j1Address as string).toLowerCase();
      const possibleKeys = [
        `rps_move_${contractAddress}_${p1Addr}`,
        `rps_move_${contractAddress.toLowerCase()}_${p1Addr}`,
        `rps_last_game_move`,
      ];
      
      let p1MoveStr: string | null = null;
      for (const key of possibleKeys) {
        p1MoveStr = localStorage.getItem(key);
        if (p1MoveStr) break;
      }
      
      if (!p1MoveStr && account?.address.toLowerCase() === p1Addr) {
        for (const key of possibleKeys) {
          const testKey = key.replace(p1Addr, account.address);
          p1MoveStr = localStorage.getItem(testKey);
          if (p1MoveStr) break;
        }
      }

      if (p1MoveStr) {
        const p1Move = parseInt(p1MoveStr);
        setPlayer1Move(p1Move);
        setPlayer2Move(p2Move);
        setWinnerResult(determineWinner(p1Move, p2Move));
        setDataSource('localStorage');
        setLoading(false);
      } else {
        setPlayer2Move(p2Move);
        await fetchWinnerFromChain(contractAddress, j1Address as string, j2Address as string);
        
        if (winnerResult === null && player1Move === null) {
          if (retryCount < 4) {
            const delays = [1000, 2000, 3000, 5000];
            const delay = delays[retryCount];
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, delay);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
        
        setIsRetrying(false);
      }
    };
    
    loadGameData();
  }, [c2MoveData, j1Address, j2Address, contractAddress, account, retryCount]);

  const fetchWinnerFromChain = async (contract: string, p1: string, p2: string) => {
    try {
      const response = await fetch(`/api/get-internal-transactions?contractAddress=${contract}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      if (data.error) {
        setLoading(false);
        return;
      }
      
      if (data.regularTransactions?.result?.length > 0) {
        const solveTx = data.regularTransactions.result.find((tx: any) => 
          tx.methodId === '0xa5ddec7c' || (tx.functionName && tx.functionName.includes('solve'))
        );
        
        if (solveTx) {
          try {
            const c1Hex = solveTx.input.slice(10, 74);
            const player1MoveFromTx = parseInt(c1Hex, 16);
            setPlayer1Move(player1MoveFromTx);
            
            if (player2Move !== null) {
              const winner = determineWinner(player1MoveFromTx, player2Move);
              setWinnerResult(winner);
              setDataSource('blockchain');
            }
          } catch (decodeErr) {}
        }
      }
      
      const internalData = data.internalTransactions || data;
      
      if (internalData.status === '1' && internalData.result?.length > 0) {
        const payoutTxs = internalData.result.filter((tx: any) => 
          tx.from.toLowerCase() === contract.toLowerCase() && 
          tx.value !== '0' &&
          tx.type !== 'create'
        );
        
        if (payoutTxs.length > 0) {
          if (payoutTxs.length === 2) {
            const p1Payout = payoutTxs.find((tx: any) => tx.to.toLowerCase() === p1.toLowerCase());
            const p2Payout = payoutTxs.find((tx: any) => tx.to.toLowerCase() === p2.toLowerCase());
            
            if (p1Payout && p2Payout && p1Payout.value === p2Payout.value) {
              setWinnerResult(0);
            } else {
              const winnerTx = payoutTxs[0];
              const winner = winnerTx.to.toLowerCase();
              setWinnerAddress(winner);
              setDataSource('blockchain');
              
              if (winner === p1.toLowerCase()) {
                setWinnerResult(1);
              } else if (winner === p2.toLowerCase()) {
                setWinnerResult(2);
              }
            }
          } else {
            const winnerTx = payoutTxs[0];
            const winner = winnerTx.to.toLowerCase();
            setWinnerAddress(winner);
            setDataSource('blockchain');
            
            if (winner === p1.toLowerCase()) {
              setWinnerResult(1);
            } else if (winner === p2.toLowerCase()) {
              setWinnerResult(2);
            }
          }
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching game data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-white text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Game Completed</h2>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">
            {retryCount > 0 ? `Retrying... (attempt ${retryCount + 1})` : 'Loading game results from blockchain...'}
          </p>
        </div>
        <p className="text-xs text-gray-500 font-mono mb-2">Contract: {contractAddress}</p>
        {retryCount > 0 && (
          <p className="text-xs text-blue-600 mb-2">
            <Icon name="clock" className="mr-1" />
            Waiting for blockchain to index transaction data...
          </p>
        )}
      </div>
    );
  }

  if (player1Move === null && player2Move !== null) {
    const isPlayer1 = account?.address.toLowerCase() === (j1Address as string)?.toLowerCase();
    const isPlayer2 = account?.address.toLowerCase() === (j2Address as string)?.toLowerCase();
    
    let outcomeTitle = 'Game Completed';
    let outcomeColor = 'text-yellow-600';
    let outcomeSubtitle = "Player 1's move unknown, but winner determined from blockchain!";
    
    if (winnerResult !== null) {
      if (winnerResult === 0) {
        outcomeTitle = 'It\'s a Tie!';
        outcomeColor = 'text-yellow-600';
        outcomeSubtitle = 'Both players got their stake back (determined from blockchain).';
      } else if (winnerResult === 1) {
        outcomeTitle = isPlayer1 ? 'You Won!' : 'You Lost!';
        outcomeColor = isPlayer1 ? 'text-green-600' : 'text-red-600';
        outcomeSubtitle = 'Player 1 received the full pot (verified from blockchain transactions)!';
      } else if (winnerResult === 2) {
        outcomeTitle = isPlayer2 ? 'You Won!' : 'You Lost!';
        outcomeColor = isPlayer2 ? 'text-green-600' : 'text-red-600';
        outcomeSubtitle = 'Player 2 received the full pot (verified from blockchain transactions)!';
      }
    } else {
      outcomeSubtitle = "Player 1's move not found. Check your wallet balance to see the outcome.";
    }
    
    return (
      <div className="border rounded-lg p-6 bg-white shadow-lg">
        <h2 className={`text-3xl font-bold mb-2 text-center ${outcomeColor}`}>
          {outcomeTitle}
        </h2>
        <p className="text-center text-gray-700 mb-4">
          {outcomeSubtitle}
        </p>
        
        {winnerResult !== null && dataSource === 'blockchain' && (
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              <Icon name="externalLink" className="mr-1" />
              Winner Calculated from Blockchain
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {isPlayer2 ? (
            <>
              <div>
                <div className={`border-2 p-4 rounded-lg text-center ${
                  winnerResult === 2 
                    ? 'bg-green-50 border-green-500' 
                    : winnerResult === 1 
                      ? 'bg-red-50 border-red-300'
                      : 'bg-blue-50 border-blue-300'
                }`}>
                <p className="text-xs font-semibold mb-1 flex items-center">
                  You (Player 2)
                  {winnerResult === 2 && <Icon name="trophy" className="ml-1" />}
                </p>
                <p className="text-sm text-gray-700 mb-2 font-mono">
                  {formatAddress(j2Address as string)}
                </p>
                <div className="text-4xl mb-2">
                  {player2Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                  {player2Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                  {player2Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                  {player2Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                  {player2Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
                </div>
                <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player2Move]}</p>
                </div>
              </div>

              <div>
                <div className={`border-2 p-4 rounded-lg text-center ${
                winnerResult === 1 
                  ? 'bg-green-50 border-green-500' 
                  : winnerResult === 2 
                    ? 'bg-red-50 border-red-300'
                    : 'bg-gray-100 border-gray-300'
              }`}>
                <p className="text-xs text-gray-600 font-semibold mb-1">
                  Opponent (Player 1)
                  {winnerResult === 1 && ' <Icon name="trophy" className="ml-1" />'}
                </p>
                <p className="text-sm text-gray-700 mb-2 font-mono">
                  {formatAddress(j1Address as string)}
                </p>
                <div className="text-4xl mb-2">❓</div>
                <p className="text-xl font-bold text-gray-500">Unknown</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className={`border-2 p-4 rounded-lg text-center ${
                  winnerResult === 1 
                    ? 'bg-green-50 border-green-500' 
                    : winnerResult === 2 
                      ? 'bg-red-50 border-red-300'
                      : 'bg-gray-100 border-gray-300'
                }`}>
                <p className="text-xs text-gray-600 font-semibold mb-1">
                  You (Player 1)
                  {winnerResult === 1 && ' <Icon name="trophy" className="ml-1" />'}
                </p>
                <p className="text-sm text-gray-700 mb-2 font-mono">
                  {formatAddress(j1Address as string)}
                </p>
                <div className="text-4xl mb-2">❓</div>
                <p className="text-xl font-bold text-gray-500">Unknown</p>
              </div>

              <div className={`border-2 p-4 rounded-lg text-center ${
                winnerResult === 2 
                  ? 'bg-green-50 border-green-500' 
                  : winnerResult === 1 
                    ? 'bg-red-50 border-red-300'
                    : 'bg-blue-50 border-blue-300'
              }`}>
                <p className="text-xs font-semibold mb-1">
                  Opponent (Player 2)
                  {winnerResult === 2 && ' <Icon name="trophy" className="ml-1" />'}
                </p>
                <p className="text-sm text-gray-700 mb-2 font-mono">
                  {formatAddress(j2Address as string)}
                </p>
                <div className="text-4xl mb-2">
                  {player2Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                  {player2Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                  {player2Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                  {player2Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                  {player2Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
                </div>
                <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player2Move]}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {winnerResult === null && (
          <>
            <div className="text-center mb-4">
              <button
                onClick={handleRefresh}
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
            
            <div className="bg-blue-50 border border-blue-300 p-4 rounded mb-4">
              <p className="text-blue-900 font-bold mb-3 text-center text-lg">
                🔍 Check Who Won
              </p>
              <div className="space-y-2 text-sm text-blue-800">
              <p className="font-semibold">Check your wallet balance to see the outcome:</p>
              <ul className="list-none space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>You Won:</strong> You received 2x the stake (full pot)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">≈</span>
                  <span><strong>Tie:</strong> You got your stake back (1x stake)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span><strong>You Lost:</strong> You received nothing (stake lost)</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-blue-700">
                💡 <strong>Tip:</strong> Check the contract transaction history on PolygonScan to see the exact payout.
              </p>
              </div>
            </div>
          </>
        )}

        <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mb-4 text-sm">
          <p className="text-yellow-800 font-semibold mb-2">
            ℹ️ Why is Player 1's move missing?
          </p>
          <p className="text-yellow-700 text-xs">
            The RPS contract doesn't store Player 1's move after reveal. It was stored in Player 1's browser but isn't accessible here.
            However, the game outcome has been determined and funds distributed based on the moves.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-3 rounded mb-4 text-sm">
          <p className="text-gray-700">
            <strong>Contract:</strong>{' '}
            <a 
              href={`https://amoy.polygonscan.com/address/${contractAddress}`}
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
              href={`https://amoy.polygonscan.com/address/${contractAddress}#internaltx`}
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
          🎮 Start New Game
        </button>
      </div>
    );
  }

  if (player1Move === null || player2Move === null || winnerResult === null) {
    return (
      <div className="border rounded-lg p-6 bg-white text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Game Completed</h2>
        <p className="text-gray-600">Unable to load full game results</p>
        <button
          onClick={onStartNew}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          🎮 Start New Game
        </button>
      </div>
    );
  }

  const isPlayer1 = account?.address.toLowerCase() === (j1Address as string)?.toLowerCase();
  const isPlayer2 = account?.address.toLowerCase() === (j2Address as string)?.toLowerCase();

  let outcomeMessage = '';
  let winnerMessage = '';
  let outcomeColor = 'text-gray-800';
  let outcomeEmoji = '🎮';

  if (winnerResult === 0) {
    outcomeMessage = 'It\'s a Tie!';
    winnerMessage = `Both players chose ${MOVE_NAMES[player1Move]}. The stake has been split.`;
    outcomeColor = 'text-yellow-600';
    outcomeEmoji = '🤝';
  } else if (winnerResult === 1) {
    outcomeMessage = isPlayer1 ? 'You Won!' : 'You Lost!';
    winnerMessage = isPlayer1 
      ? `${MOVE_NAMES[player1Move]} beats ${MOVE_NAMES[player2Move]}. You received the stake!`
      : `${MOVE_NAMES[player1Move]} beats ${MOVE_NAMES[player2Move]}. Player 1 wins!`;
    outcomeColor = isPlayer1 ? 'text-green-600' : 'text-red-600';
    outcomeEmoji = isPlayer1 ? '🎉' : '😔';
  } else if (winnerResult === 2) {
    outcomeMessage = isPlayer2 ? 'You Won!' : 'You Lost!';
    winnerMessage = isPlayer2
      ? `${MOVE_NAMES[player2Move]} beats ${MOVE_NAMES[player1Move]}. You received the stake!`
      : `${MOVE_NAMES[player2Move]} beats ${MOVE_NAMES[player1Move]}. Player 2 wins!`;
    outcomeColor = isPlayer2 ? 'text-green-600' : 'text-red-600';
    outcomeEmoji = isPlayer2 ? '🎉' : '😔';
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-lg">
      <h2 className={`text-4xl font-bold mb-2 text-center ${outcomeColor}`}>
        {outcomeEmoji} {outcomeMessage}
      </h2>
      <p className="text-center text-gray-700 mb-4 text-lg">{winnerMessage}</p>
      
      {dataSource && (
        <div className="text-center mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            dataSource === 'localStorage' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {dataSource === 'localStorage' && '💾 Loaded from Your Browser'}
            {dataSource === 'blockchain' && '⛓️ Calculated from Blockchain'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {isPlayer1 ? (
          <>
            <div className={`border-2 p-4 rounded-lg text-center ${
              winnerResult === 1 ? 'bg-green-50 border-green-500' : 
              winnerResult === 2 ? 'bg-red-50 border-red-300' : 
              'bg-gray-50 border-gray-300'
            }`}>
              <p className="text-xs text-gray-600 font-semibold mb-1">
                You (Player 1)
              </p>
              <p className="text-sm text-gray-700 mb-2 font-mono">
                {formatAddress(j1Address as string)}
              </p>
              <div className="text-4xl mb-2">
                {player1Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                {player1Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                {player1Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                {player1Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                {player1Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
              </div>
              <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player1Move]}</p>
            </div>

            <div className={`border-2 p-4 rounded-lg text-center ${
              winnerResult === 2 ? 'bg-green-50 border-green-500' : 
              winnerResult === 1 ? 'bg-red-50 border-red-300' : 
              'bg-gray-50 border-gray-300'
            }`}>
              <p className="text-xs text-gray-600 font-semibold mb-1">
                Opponent (Player 2)
              </p>
              <p className="text-sm text-gray-700 mb-2 font-mono">
                {formatAddress(j2Address as string)}
              </p>
              <div className="text-4xl mb-2">
                {player2Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                {player2Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                {player2Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                {player2Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                {player2Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
              </div>
              <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player2Move]}</p>
            </div>
          </>
        ) : (
          <>
            <div className={`border-2 p-4 rounded-lg text-center ${
              winnerResult === 2 ? 'bg-green-50 border-green-500' : 
              winnerResult === 1 ? 'bg-red-50 border-red-300' : 
              'bg-gray-50 border-gray-300'
            }`}>
              <p className="text-xs text-gray-600 font-semibold mb-1">
                You (Player 2)
              </p>
              <p className="text-sm text-gray-700 mb-2 font-mono">
                {formatAddress(j2Address as string)}
              </p>
              <div className="text-4xl mb-2">
                {player2Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                {player2Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                {player2Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                {player2Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                {player2Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
              </div>
              <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player2Move]}</p>
            </div>

            <div className={`border-2 p-4 rounded-lg text-center ${
              winnerResult === 1 ? 'bg-green-50 border-green-500' : 
              winnerResult === 2 ? 'bg-red-50 border-red-300' : 
              'bg-gray-50 border-gray-300'
            }`}>
              <p className="text-xs text-gray-600 font-semibold mb-1">
                Opponent (Player 1)
              </p>
              <p className="text-sm text-gray-700 mb-2 font-mono">
                {formatAddress(j1Address as string)}
              </p>
              <div className="text-4xl mb-2">
                {player1Move === MOVES.ROCK && <Icon name="rock" className="text-gray-600" />}
                {player1Move === MOVES.PAPER && <Icon name="paper" className="text-gray-600" />}
                {player1Move === MOVES.SCISSORS && <Icon name="scissors" className="text-gray-600" />}
                {player1Move === MOVES.SPOCK && <Icon name="spock" className="text-gray-600" />}
                {player1Move === MOVES.LIZARD && <Icon name="lizard" className="text-gray-600" />}
              </div>
              <p className="text-xl font-bold text-gray-900">{MOVE_NAMES[player1Move]}</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 p-3 rounded mb-4 text-sm">
        <p className="text-gray-700">
          <strong>Contract:</strong>{' '}
          <a 
            href={`https://amoy.polygonscan.com/address/${contractAddress}`}
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
      </div>

      <button
        onClick={onStartNew}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        🎮 Start New Game
      </button>
    </div>
  );
}

