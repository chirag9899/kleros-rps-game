import { MOVE_NAMES } from './contract';

export interface GameResult {
  player1Move: number;
  player2Move: number;
  winner: 'player1' | 'player2' | 'tie';
  timestamp: number;
}

export function determineWinner(move1: number, move2: number): 'player1' | 'player2' | 'tie' {
  if (move1 === move2) return 'tie';
  
  // Same parity (both odd or both even) - lower wins
  if (move1 % 2 === move2 % 2) {
    return move1 < move2 ? 'player1' : 'player2';
  }
  
  // Different parity - higher wins
  return move1 > move2 ? 'player1' : 'player2';
}

export function storeGameResult(contractAddress: string, player1Move: number, player2Move: number) {
  const result: GameResult = {
    player1Move,
    player2Move,
    winner: determineWinner(player1Move, player2Move),
    timestamp: Date.now(),
  };
  
  localStorage.setItem(`rps_result_${contractAddress}`, JSON.stringify(result));
}

export function getGameResult(contractAddress: string): GameResult | null {
  try {
    const stored = localStorage.getItem(`rps_result_${contractAddress}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading game result:', error);
    return null;
  }
}

export function getResultText(result: GameResult, isPlayer1: boolean): string {
  const { player1Move, player2Move, winner } = result;
  const p1MoveName = MOVE_NAMES[player1Move];
  const p2MoveName = MOVE_NAMES[player2Move];
  
  if (winner === 'tie') {
    return `It's a tie! Both played ${p1MoveName}`;
  }
  
  const youWon = (isPlayer1 && winner === 'player1') || (!isPlayer1 && winner === 'player2');
  
  if (youWon) {
    return `You won! ${isPlayer1 ? p1MoveName : p2MoveName} beats ${isPlayer1 ? p2MoveName : p1MoveName}`;
  } else {
    return `You lost! ${isPlayer1 ? p2MoveName : p1MoveName} beats ${isPlayer1 ? p1MoveName : p2MoveName}`;
  }
}

export function getWinExplanation(move1: number, move2: number): string {
  if (move1 === move2) {
    return `Both players chose ${MOVE_NAMES[move1]}. Stakes returned.`;
  }
  
  const winner = determineWinner(move1, move2);
  const winnerMove = winner === 'player1' ? move1 : move2;
  const loserMove = winner === 'player1' ? move2 : move1;
  const winnerName = MOVE_NAMES[winnerMove];
  const loserName = MOVE_NAMES[loserMove];
  
  const beats: { [key: number]: number[] } = {
    1: [3, 5], // rock beats scissors, lizard
    2: [1, 4], // paper beats rock, spock
    3: [2, 5], // scissors beats paper, lizard
    4: [3, 1], // spock beats scissors, rock
    5: [4, 2], // lizard beats spock, paper
  };
  
  return `${winnerName} beats ${loserName}. Player ${winner === 'player1' ? '1' : '2'} wins!`;
}

