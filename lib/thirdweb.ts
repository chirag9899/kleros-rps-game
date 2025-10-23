import { createThirdwebClient, getContract } from 'thirdweb';
import { polygonAmoy } from 'thirdweb/chains';

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 'placeholder',
});

export function getRPSContract(address: string) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }
  
  return getContract({
    client,
    chain: polygonAmoy,
    address: address as `0x${string}`,
  });
}

export const chain = polygonAmoy;

