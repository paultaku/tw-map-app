'use client';
import { useEffect, useMemo, useRef } from 'react';

// 通用防抖 hook：回傳一個被防抖包裝的函式
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 300,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn; // 永遠呼叫最新 fn，避免 stale closure

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useMemo(
    () =>
      (...args: A) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delay);
      },
    [delay],
  );

  // 卸載時清除計時器
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return debounced;
}
