export interface BalanceData {
  address: string;
  balanceWei: string;
  balanceEth: string;
}

interface ErrorData {
  error: string;
  code: string;
}

const API_BASE = '/api';

export async function fetchBalance(address: string): Promise<BalanceData> {
  const res = await fetch(`${API_BASE}/balance?address=${encodeURIComponent(address)}`);

  if (!res.ok) {
    const body: ErrorData = await res.json();
    throw new Error(body.error || 'Failed to fetch balance');
  }

  return res.json();
}
