'use client';

import { useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { polygonAmoy } from 'thirdweb/chains';

export function useForceChain() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchActiveWalletChain = useSwitchActiveWalletChain();

  useEffect(() => {
    if (account && activeChain && activeChain.id !== polygonAmoy.id) {
      switchActiveWalletChain(polygonAmoy).catch((error) => {
        console.log('User rejected chain switch or error occurred:', error);
      });
    }
  }, [account, activeChain, switchActiveWalletChain]);

  return {
    isCorrectChain: activeChain?.id === polygonAmoy.id,
    activeChain,
    switchToAmoy: () => switchActiveWalletChain(polygonAmoy)
  };
}
