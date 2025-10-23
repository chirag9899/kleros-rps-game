export interface GameHistory {
  contractAddress: string;
  role: 'player1' | 'player2';
  opponent: string;
  stake: string;
  timestamp: number;
  status?: 'created' | 'joined' | 'revealed' | 'completed' | 'timeout';
}

const HISTORY_KEY = 'rps_game_history';
const MAX_HISTORY = 50;

export function getGameHistory(): GameHistory[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Error loading game history:', error);
    return [];
  }
}

export function addGameToHistory(game: Omit<GameHistory, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getGameHistory();
    
    const existingIndex = history.findIndex(
      g => g.contractAddress.toLowerCase() === game.contractAddress.toLowerCase()
    );
    
    const newGame: GameHistory = {
      ...game,
      timestamp: Date.now(),
    };
    
    if (existingIndex >= 0) {
      history[existingIndex] = newGame;
    } else {
      history.unshift(newGame);
    }
    
    const trimmed = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving game history:', error);
  }
}

export function updateGameStatus(contractAddress: string, status: GameHistory['status']) {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getGameHistory();
    const index = history.findIndex(
      g => g.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    
    if (index >= 0) {
      history[index].status = status;
      history[index].timestamp = Date.now();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Error updating game status:', error);
  }
}

export function clearGameHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return 'Just now';
  }
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  return date.toLocaleDateString();
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

