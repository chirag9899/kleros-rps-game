import { createThirdwebClient, getContract } from 'thirdweb';
import { polygonAmoy, sepolia } from 'thirdweb/chains';

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 'placeholder',
});

export function getRPSContract(address: string, chainId?: number) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }
  
  const selectedChain = chainId === 11155111 ? sepolia : polygonAmoy;
  
  return getContract({
    client,
    chain: selectedChain,
    address: address as `0x${string}`,
  });
}

export const chain = polygonAmoy;
export const sepoliaChain = sepolia;

