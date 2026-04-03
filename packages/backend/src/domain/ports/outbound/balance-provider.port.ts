export interface BalanceProviderResult {
  balance: bigint;
  cached: boolean;
}

export interface BalanceProviderPort {
  getBalance(address: string): Promise<BalanceProviderResult>;
}
