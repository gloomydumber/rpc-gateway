export interface BalanceResponse {
  address: string;
  balanceWei: string;
  balanceEth: string;
  cached: boolean;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
