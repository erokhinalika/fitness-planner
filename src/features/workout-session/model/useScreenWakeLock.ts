import { useCallback, useEffect, useRef } from "react";

export function useScreenWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestScreenWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      lock.addEventListener("release", () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch {
      // Wake lock is optional.
    }
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void requestScreenWakeLock();
    }

    void requestScreenWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      void lock?.release();
    };
  }, [requestScreenWakeLock]);

  useEffect(() => {
    if (active) void requestScreenWakeLock();
  }, [active, requestScreenWakeLock]);
}
