"use client";

import { useState, useEffect, useRef } from "react";
import { Wallet, X } from "lucide-react";

const LS_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Only on mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Already dismissed permanently
    if (localStorage.getItem(LS_KEY) === "true") return;

    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Auto-hide if app gets installed
    const installedHandler = () => {
      setShow(false);
      deferredPrompt.current = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      dismiss(false);
    }
    deferredPrompt.current = null;
  };

  const dismiss = (permanent: boolean) => {
    setLeaving(true);
    if (permanent) {
      localStorage.setItem(LS_KEY, "true");
    }
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-[4.5rem] left-0 right-0 z-40 flex justify-center px-4 md:hidden ${
        leaving ? "animate-slide-down" : "animate-slide-up"
      }`}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-4">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Instalar MisCuentas
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Accede mas rapido desde tu pantalla de inicio
            </p>
          </div>

          {/* Close */}
          <button
            onClick={() => dismiss(true)}
            className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => dismiss(true)}
            className="flex-1 text-sm text-gray-500 dark:text-gray-400 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            No gracias
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl transition-colors"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
