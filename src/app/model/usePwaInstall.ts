import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

const INSTALL_DISMISS_KEY = "angelika-pwa-install-dismissed";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [installVisible, setInstallVisible] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(() => localStorage.getItem(INSTALL_DISMISS_KEY) === "1");
  const [iosInstallHint, setIosInstallHint] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const updateSwRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    updateSwRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
  }, []);

  useEffect(() => {
    function goOffline() {
      setIsOffline(true);
    }
    function goOnline() {
      setIsOffline(false);
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneApp() || installDismissed) return;
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [installDismissed]);

  useEffect(() => {
    if (installDismissed || isStandaloneApp()) return;
    if (deferredInstallPrompt || isIosDevice()) {
      setInstallVisible(true);
    }
  }, [deferredInstallPrompt, installDismissed]);

  const canInstallApp = !isStandaloneApp() && (Boolean(deferredInstallPrompt) || isIosDevice());

  async function runInstallApp() {
    if (!deferredInstallPrompt) {
      setIosInstallHint(true);
      setInstallVisible(true);
      return;
    }
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredInstallPrompt(null);
      setInstallDismissed(true);
      localStorage.setItem(INSTALL_DISMISS_KEY, "1");
      setInstallVisible(false);
    }
  }

  function dismissInstallPrompt() {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setInstallDismissed(true);
    setInstallVisible(false);
  }

  function openInstallPrompt() {
    setInstallVisible(true);
    setIosInstallHint(!deferredInstallPrompt && isIosDevice());
  }

  function refreshApp() {
    void updateSwRef.current?.(true);
  }

  return {
    canInstallApp,
    dismissInstallPrompt,
    installVisible,
    iosInstallHint,
    isOffline,
    needRefresh,
    openInstallPrompt,
    refreshApp,
    runInstallApp,
  };
}
