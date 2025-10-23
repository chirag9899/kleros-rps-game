import { ethers } from 'ethers';

export const RPS_ABI = [
  "constructor(bytes32 _c1Hash, address _j2, uint256 _timeout) payable",
  "function play(uint8 _c2) external payable",
  "function solve(uint8 _c1, uint256 _salt) external",
  "function j1Timeout() external",
  "function j2Timeout() external",
  "function c1Hash() external view returns (bytes32)",
  "function c2() external view returns (uint8)",
  "function j1() external view returns (address)",
  "function j2() external view returns (address)",
  "function stake() external view returns (uint256)",
  "function timeout() external view returns (uint256)",
  "function TIMEOUT() external view returns (uint256)",
  "function lastAction() external view returns (uint256)"
];

export const MOVES = {
  NULL: 0,
  ROCK: 1,
  PAPER: 2,
  SCISSORS: 3,
  SPOCK: 4,
  LIZARD: 5
};

export const MOVE_NAMES: { [key: number]: string } = {
  0: 'Null',
  1: 'Rock',
  2: 'Paper',
  3: 'Scissors',
  4: 'Spock',
  5: 'Lizard'
};

export function generateSalt(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function computeHash(move: number, salt: string): string {
  return ethers.utils.solidityKeccak256(
    ['uint8', 'uint256'],
    [move, salt]
  );
}

export function storeSalt(contractAddr: string, playerAddr: string, salt: string) {
  const key = `rps_salt_${contractAddr}_${playerAddr}`;
  localStorage.setItem(key, salt);
}
export function getSalt(contractAddr: string, playerAddr: string): string | null {
  const key = `rps_salt_${contractAddr}_${playerAddr}`;
  return localStorage.getItem(key);
}

export function clearSalt(contractAddr: string, playerAddr: string) {
  const key = `rps_salt_${contractAddr}_${playerAddr}`;
  localStorage.removeItem(key);
}

export function determineWinner(move1: number, move2: number): number {
  if (move1 === move2) return 0;
  
  if (move1 === MOVES.ROCK && (move2 === MOVES.SCISSORS || move2 === MOVES.LIZARD)) return 1;
  if (move2 === MOVES.ROCK && (move1 === MOVES.SCISSORS || move1 === MOVES.LIZARD)) return 2;
  
  if (move1 === MOVES.PAPER && (move2 === MOVES.ROCK || move2 === MOVES.SPOCK)) return 1;
  if (move2 === MOVES.PAPER && (move1 === MOVES.ROCK || move1 === MOVES.SPOCK)) return 2;
  
  if (move1 === MOVES.SCISSORS && (move2 === MOVES.PAPER || move2 === MOVES.LIZARD)) return 1;
  if (move2 === MOVES.SCISSORS && (move1 === MOVES.PAPER || move1 === MOVES.LIZARD)) return 2;
  
  if (move1 === MOVES.SPOCK && (move2 === MOVES.SCISSORS || move2 === MOVES.ROCK)) return 1;
  if (move2 === MOVES.SPOCK && (move1 === MOVES.SCISSORS || move1 === MOVES.ROCK)) return 2;
  
  if (move1 === MOVES.LIZARD && (move2 === MOVES.SPOCK || move2 === MOVES.PAPER)) return 1;
  if (move2 === MOVES.LIZARD && (move1 === MOVES.SPOCK || move1 === MOVES.PAPER)) return 2;
  
  return 0;
}

export function formatEth(wei: ethers.BigNumber | string): string {
  try {
    return ethers.utils.formatEther(wei);
  } catch {
    return '0';
  }
}

export function parseEth(eth: string): ethers.BigNumber {
  try {
    return ethers.utils.parseEther(eth);
  } catch {
    return ethers.BigNumber.from(0);
  }
}

