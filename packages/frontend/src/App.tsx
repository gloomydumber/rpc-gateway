import { useBalance } from './hooks/useBalance';
import { useThrottle } from './hooks/useThrottle';
import { AddressInput } from './components/AddressInput';
import { BalanceDisplay } from './components/BalanceDisplay';
import { ErrorMessage } from './components/ErrorMessage';

export function App() {
  const { address, balance, loading, error, register, refresh, unregister } = useBalance();
  const { throttled, cooldown } = useThrottle(5000);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Balance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter an Ethereum address to check its balance on Sepolia.
          </p>
        </div>

        {!address ? (
          <AddressInput onRegister={register} disabled={loading} />
        ) : (
          <div className="space-y-4">
            <BalanceDisplay
              address={address}
              data={balance}
              onRefresh={() => throttled(refresh)}
              loading={loading}
              cooldown={cooldown}
            />

            {error && <ErrorMessage message={error} />}

            <button
              onClick={unregister}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Change address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
