import { useState, useEffect } from 'react';
import { useReadContract, useActiveWalletChain } from 'thirdweb/react';
import { getRPSContract } from '@/lib/thirdweb';
import { determineWinner } from '@/lib/contract';
import { getGameResult } from '@/lib/game-result';

export interface GameData {
  player1Move: number | null;
  player2Move: number | null;
  winnerResult: number | null;
  winnerAddress: string | null;
  dataSource: 'localStorage' | 'blockchain' | 'timeout' | null;
  loading: boolean;
  retryCount: number;
  isRetrying: boolean;
  j1Address: string | null;
  j2Address: string | null;
  handleRefresh: () => Promise<void>;
}

export function useGameData(contractAddress: string, account: any): GameData {
  const [player1Move, setPlayer1Move] = useState<number | null>(null);
  const [player2Move, setPlayer2Move] = useState<number | null>(null);
  const [winnerResult, setWinnerResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [winnerAddress, setWinnerAddress] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'localStorage' | 'blockchain' | 'timeout' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const activeChain = useActiveWalletChain();

  const contract = getRPSContract(contractAddress, activeChain?.id);

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

  const fetchWinnerFromChain = async (contract: string, p1: string, p2: string) => {
    try {
      const response = await fetch(`/api/get-internal-transactions?contractAddress=${contract}&chainId=${activeChain?.id}`);
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
          setDataSource('blockchain');
          
          if (payoutTxs.length === 2) {
            const p1Payout = payoutTxs.find((tx: any) => tx.to.toLowerCase() === p1.toLowerCase());
            const p2Payout = payoutTxs.find((tx: any) => tx.to.toLowerCase() === p2.toLowerCase());
            
            if (p1Payout && p2Payout && p1Payout.value === p2Payout.value) {
              setWinnerResult(0);
            } else {
              const winnerTx = payoutTxs.find((tx: any) => 
                tx.to.toLowerCase() === p1.toLowerCase() || tx.to.toLowerCase() === p2.toLowerCase()
              );
              if (winnerTx) {
                const winner = winnerTx.to.toLowerCase();
                setWinnerAddress(winner);
                if (winner === p1.toLowerCase()) {
                  setWinnerResult(1);
                } else if (winner === p2.toLowerCase()) {
                  setWinnerResult(2);
                }
              }
            }
          } else if (payoutTxs.length === 1) {
            const winnerTx = payoutTxs[0];
            const winner = winnerTx.to.toLowerCase();
            setWinnerAddress(winner);
            
            if (winner === p1.toLowerCase()) {
              setWinnerResult(1);
            } else if (winner === p2.toLowerCase()) {
              setWinnerResult(2);
            }
          }
        }
      }
      
      // Check for actual timeout claim transactions
      if (winnerResult === null && player1Move === null) {
        const hasJ1Timeout = data.regularTransactions?.result?.some((tx: any) => 
          tx.methodId === '0xc37597c6' || (tx.functionName && tx.functionName.includes('j1Timeout'))
        );
        const hasJ2Timeout = data.regularTransactions?.result?.some((tx: any) => 
          tx.methodId === '0xc8391142' || (tx.functionName && tx.functionName.includes('j2Timeout'))
        );
        
        if (hasJ1Timeout || hasJ2Timeout) {
          const p2Move = Number(c2MoveData);
          if (hasJ2Timeout) {
            setPlayer1Move(null);
            setPlayer2Move(0);
            setWinnerResult(1);
            setDataSource('timeout');
          } else if (hasJ1Timeout) {
            setPlayer1Move(null);
            setPlayer2Move(p2Move);
            setWinnerResult(2);
            setDataSource('timeout');
          }
        }
      }
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadGameData = async () => {
      if (c2MoveData === undefined || !j1Address || !j2Address) {
        return;
      }

      const p2Move = Number(c2MoveData);
      
      if (p2Move === 0) {
        setPlayer1Move(null);
        setPlayer2Move(0);
        setWinnerResult(1);
        setDataSource('timeout');
        setLoading(false);
        return;
      }
      
      setPlayer2Move(p2Move);
      await fetchWinnerFromChain(contractAddress, j1Address as string, j2Address as string);
      
      if (winnerResult === null && player1Move === null) {
        if (retryCount < 4) {
          const delays = [1000, 2000, 3000, 5000];
          const delay = delays[retryCount];
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, delay);
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
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
      
      setIsRetrying(false);
    };
    
    loadGameData();
  }, [c2MoveData, j1Address, j2Address, contractAddress, account, retryCount]);

  const handleRefresh = async () => {
    setIsRetrying(true);
    setLoading(true);
    setRetryCount(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return {
    player1Move,
    player2Move,
    winnerResult,
    winnerAddress,
    dataSource,
    loading,
    retryCount,
    isRetrying,
    j1Address: j1Address as string,
    j2Address: j2Address as string,
    handleRefresh,
  };
}
