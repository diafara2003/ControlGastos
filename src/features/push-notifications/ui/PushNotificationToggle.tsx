"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/src/shared/ui/switch";
import { Bell } from "lucide-react";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(isSupported);

    if (isSupported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setEnabled(!!sub);
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    try {
      // Get VAPID public key
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error("No VAPID key");

      const reg = await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return false;
      }

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Save subscription on server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      return saveRes.ok;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      return true;
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      return false;
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    if (checked) {
      const ok = await subscribe();
      setEnabled(ok);
    } else {
      const ok = await unsubscribe();
      if (ok) setEnabled(false);
    }
    setLoading(false);
  };

  if (!supported) {
    return (
      <div className="flex items-center justify-between opacity-50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <div>
            <span className="text-sm text-gray-700">Notificaciones</span>
            <p className="text-[10px] text-gray-400">No soportado en este navegador</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-gray-500" />
        <div>
          <span className="text-sm text-gray-700">Notificaciones push</span>
          <p className="text-[10px] text-gray-400">
            Gastos grandes y alertas de presupuesto
          </p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        className={loading ? "opacity-50 pointer-events-none" : ""}
      />
    </div>
  );
}

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
