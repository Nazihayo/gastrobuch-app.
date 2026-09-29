"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Delays a destructive action by a few seconds so the UI can offer "Undo".
// The item is filtered out of the list immediately (via `pending`) for
// responsive feel, but the actual delete only fires once the window lapses.
export function useUndoableRemove<T>(commitRemove: (item: T) => void, delayMs = 5000) {
  const [pending, setPending] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemRef = useRef<T | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const scheduleRemove = useCallback(
    (item: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        if (pendingItemRef.current) commitRemove(pendingItemRef.current);
      }
      pendingItemRef.current = item;
      setPending(item);
      timeoutRef.current = setTimeout(() => {
        commitRemove(item);
        pendingItemRef.current = null;
        setPending(null);
      }, delayMs);
    },
    [commitRemove, delayMs]
  );

  const undo = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pendingItemRef.current = null;
    setPending(null);
  }, []);

  return { pending, scheduleRemove, undo };
}
