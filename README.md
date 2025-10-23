# RPS Lizard Spock on Polygon

Simple web3 version of Rock Paper Scissors Lizard Spock. Two players stake ETH and the winner takes all.

## Getting started

```bash
npm install
npm run dev
```

You'll need:
- MetaMask wallet
- Some testnet MATIC (get from [faucet](https://faucet.polygon.technology/))
- Add Polygon Amoy network to MetaMask (chain ID: 80002)

Create `.env.local` with your thirdweb client ID.

## How to play

1. Player 1 creates game, picks move, stakes ETH
2. Player 2 joins with same stake amount
3. Player 1 reveals move
4. Winner gets both stakes

## Game rules

Rock > Scissors, Lizard  
Paper > Rock, Spock  
Scissors > Paper, Lizard  
Spock > Scissors, Rock  
Lizard > Spock, Paper

## Notes

- Each game deploys a new contract automatically
- Timeouts prevent funds from getting stuck
- Moves are hidden until reveal (commitment scheme)
- Built for Kleros interview
