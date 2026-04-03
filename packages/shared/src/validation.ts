import { isAddress } from 'viem';

export function isValidEthAddress(address: string): boolean {
  return isAddress(address);
}
