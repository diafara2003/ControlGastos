"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";

const LS_KEY_DISMISSED = "notif-prompt-dismissed-at";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Check support
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!isSupported) return;

    // Already granted or denied at browser level
    if (Notification.permission !== "default") return;

    // Check if dismissed within last 7 days
    const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < SEVEN_DAYS_MS) return;
    }

    // Show after a short delay so it doesn't compete with page load
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const subscribe = useCallback(async () => {
    try {
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error("No VAPID key");

      const reg = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      dismiss();
    } catch (err) {
      console.error("Push subscribe error:", err);
      dismiss();
    }
  }, []);

  const dismiss = () => {
    setLeaving(true);
    localStorage.setItem(LS_KEY_DISMISSED, Date.now().toString());
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
    }, 300);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          leaving ? "opacity-0" : "opacity-100"
        }`}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 mb-4 md:mb-0 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6 ${
          leaving ? "animate-slide-down" : "animate-slide-up"
        }`}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 mb-4 animate-scale-in">
            <Bell className="h-8 w-8 text-emerald-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mantente al dia
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
            Activa las notificaciones para recibir alertas de gastos grandes y presupuestos
          </p>

          {/* Actions */}
          <div className="flex w-full gap-3 mt-6">
            <button
              onClick={dismiss}
              className="flex-1 text-sm text-gray-500 dark:text-gray-400 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Ahora no
            </button>
            <button
              onClick={subscribe}
              className="flex-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl transition-colors"
            >
              Activar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
