import type { BalanceData } from '../api/balance';
import { RefreshButton } from './RefreshButton';
import { Spinner } from './Spinner';

interface BalanceDisplayProps {
  address: string;
  data: BalanceData | null;
  onRefresh: () => void;
  loading: boolean;
  cooldown: boolean;
}

export function BalanceDisplay({ address, data, onRefresh, loading, cooldown }: BalanceDisplayProps) {
  const isInitialLoad = loading && !data;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Balance</h3>
        <RefreshButton onClick={onRefresh} disabled={isInitialLoad} loading={loading && !!data} cooldown={cooldown} />
      </div>
      <div className="h-9 flex items-center">
        {isInitialLoad ? (
          <Spinner />
        ) : (
          <p className="text-2xl font-bold text-gray-900">
            {data ? `${data.balanceEth} ETH` : '\u00A0'}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 break-all mr-2">{address}</p>
        <a
          href={`https://sepolia.etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 10-2 0v4a1 1 0 001 1h4a1 1 0 100-2h-1.586l3.293-3.293a1 1 0 00-1.414-1.414L11 4.586V3z" />
            <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-1a1 1 0 10-2 0v1H5V7h1a1 1 0 000-2H5z" />
          </svg>
          Etherscan
        </a>
      </div>
    </div>
  );
}
