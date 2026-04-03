import { useState, useCallback } from 'react';
import { fetchBalance, type BalanceData } from '../api/balance';

export function useBalance() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSet = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBalance(addr);
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    (addr: string) => {
      setAddress(addr);
      setBalance(null);
      setError(null);
      fetchAndSet(addr);
    },
    [fetchAndSet],
  );

  const refresh = useCallback(() => {
    if (address) {
      fetchAndSet(address);
    }
  }, [address, fetchAndSet]);

  const unregister = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  return { address, balance, loading, error, register, refresh, unregister };
}
