import { useCallback, useRef, useState } from 'react';

export function useThrottle(delayMs: number) {
  const lastCallRef = useRef(0);
  const [cooldown, setCooldown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const throttled = useCallback(
    (fn: () => void) => {
      const now = Date.now();
      const elapsed = now - lastCallRef.current;

      if (elapsed >= delayMs) {
        lastCallRef.current = now;
        fn();
        setCooldown(true);
        timerRef.current = setTimeout(() => setCooldown(false), delayMs);
      }
    },
    [delayMs],
  );

  return { throttled, cooldown };
}
