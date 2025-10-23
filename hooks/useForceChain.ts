'use client';

import { useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { polygonAmoy, sepolia } from 'thirdweb/chains';

export function useForceChain() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchActiveWalletChain = useSwitchActiveWalletChain();

  const supportedChains = [polygonAmoy.id, sepolia.id];
  const isCorrectChain = activeChain?.id && supportedChains.includes(activeChain.id);


  return {
    isCorrectChain,
    activeChain,
    switchToAmoy: () => switchActiveWalletChain(polygonAmoy),
    switchToSepolia: () => switchActiveWalletChain(sepolia)
  };
}
