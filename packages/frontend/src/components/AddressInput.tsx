import { useState, useEffect } from 'react';
import { isAddress } from 'viem';

interface AddressInputProps {
  onRegister: (address: string) => void;
  disabled: boolean;
}

export function AddressInput({ onRegister, disabled }: AddressInputProps) {
  const [input, setInput] = useState('');
  const [valid, setValid] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setValid(isAddress(input));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const showError = touched && input.length > 0 && !valid;

  return (
    <div className="space-y-2">
      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
        Ethereum Address
      </label>
      <input
        id="address"
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (!touched) setTouched(true);
        }}
        placeholder="0x..."
        className="w-full rounded-md border border-gray-300 px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      />
      <div className="h-5">
        {showError && (
          <p className="text-sm text-red-600">Please enter a valid Ethereum address.</p>
        )}
      </div>
      <button
        onClick={() => onRegister(input)}
        disabled={!valid || disabled}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Register
      </button>
    </div>
  );
}
