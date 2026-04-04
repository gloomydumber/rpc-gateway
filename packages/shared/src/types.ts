export interface BalanceResponse {
  address: string;
  balanceWei: string;
  balanceEth: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
