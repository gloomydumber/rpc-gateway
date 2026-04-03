import { Spinner } from './Spinner';

interface RefreshButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  cooldown: boolean;
}

export function RefreshButton({ onClick, disabled, loading, cooldown }: RefreshButtonProps) {
  const showSpinner = loading || cooldown;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading || cooldown}
      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[72px] h-8"
    >
      {showSpinner ? <Spinner size="sm" /> : 'Refresh'}
    </button>
  );
}
