"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { RefreshCw, Check, AlertCircle, Mail } from "lucide-react";

type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncResult = { created: number; processed: number } | null;

export function AutoSync() {
  const syncingRef = useRef(false);
  const registeredRef = useRef(false);
  const lastSyncRef = useRef<number>(0);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [result, setResult] = useState<SyncResult>(null);

  const MIN_SYNC_INTERVAL = 2 * 60 * 1000;

  const refreshAndStoreToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const provider = session.user.app_metadata?.provider;
    const userEmail = session.user.email;
    if (!userEmail) return;

    if (provider === "azure") {
      const updates: Record<string, string> = {};
      if (session.provider_token) updates.provider_token_encrypted = session.provider_token;
      if (session.provider_refresh_token) updates.provider_refresh_token_encrypted = session.provider_refresh_token;

      if (Object.keys(updates).length > 0) {
        const { data: existing } = await supabase
          .from("email_accounts")
          .select("id")
          .eq("email", userEmail)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from("email_accounts")
            .update(updates)
            .eq("email", userEmail);
        } else if (!registeredRef.current) {
          await supabase.from("email_accounts").insert({
            user_id: session.user.id,
            provider: "outlook",
            email: userEmail,
            ...updates,
            is_active: true,
          });
        }
      }
      registeredRef.current = true;
    }
  }, []);

  const sync = useCallback(async (maxEmails: number) => {
    if (syncingRef.current) return;

    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await refreshAndStoreToken();

    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    if (!accounts || accounts.length === 0) return;

    syncingRef.current = true;
    lastSyncRef.current = now;
    setStatus("syncing");
    setResult(null);
    try {
      const res = await fetch(`/api/sync?maxEmails=${maxEmails}`, { method: "POST" });
      const data = await res.json().catch(() => null);

      const created = data?.totalCreated ?? 0;
      const processed = data?.results?.reduce((s: number, r: { processed?: number }) => s + (r.processed ?? 0), 0) ?? 0;

      setResult({ created, processed });
      setStatus(res.ok ? "success" : "error");

      if (created > 0) {
        window.dispatchEvent(new CustomEvent("transactions-updated"));
      }
    } catch {
      setStatus("error");
    } finally {
      syncingRef.current = false;
    }
  }, [refreshAndStoreToken, MIN_SYNC_INTERVAL]);

  const getAdaptiveMax = useCallback(async (): Promise<number> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_accounts")
      .select("last_sync_at")
      .eq("is_active", true)
      .limit(1);

    if (!data || data.length === 0 || !data[0].last_sync_at) return 50;

    const daysSince = (Date.now() - new Date(data[0].last_sync_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return 500;
    if (daysSince > 14) return 200;
    if (daysSince > 7) return 100;
    if (daysSince > 1) return 50;
    return 20;
  }, []);

  useEffect(() => {
    const handleManualSync = () => {
      lastSyncRef.current = 0;
      sync(20);
    };
    window.addEventListener("trigger-sync", handleManualSync);
    return () => window.removeEventListener("trigger-sync", handleManualSync);
  }, [sync]);

  useEffect(() => {
    const initialSync = setTimeout(async () => {
      const max = await getAdaptiveMax();
      sync(max);
    }, 2000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync(20);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sync(20);
      }
    }, 2 * 60 * 1000);

    return () => {
      clearTimeout(initialSync);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sync, getAdaptiveMax]);

  // Auto-hide success/error after delay
  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => setStatus("idle"), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === "idle") return null;

  const getMessage = () => {
    if (status === "syncing") return "Sincronizando correos...";
    if (status === "error") return "Error al sincronizar";
    if (!result) return "";
    if (result.created > 0) return `${result.created} nueva${result.created > 1 ? "s" : ""} transacci${result.created > 1 ? "ones" : "on"}`;
    if (result.processed > 0) return "Todo al dia";
    return "Sin correos nuevos";
  };

  const Icon = status === "syncing" ? RefreshCw : status === "success" ? (result?.created ? Mail : Check) : AlertCircle;

  return (
    <>
      {/* Thin progress bar at the very top */}
      {status === "syncing" && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-emerald-100 overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[progress_2s_ease-in-out_infinite] rounded-full" />
        </div>
      )}

      {/* Floating pill notification */}
      <div
        className={`
          fixed top-3 left-1/2 -translate-x-1/2 z-[55]
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
          text-sm font-medium backdrop-blur-sm
          transition-all duration-500 ease-out
          ${status === "syncing"
            ? "bg-white/90 text-gray-700 border border-gray-200"
            : status === "success"
            ? result?.created
              ? "bg-emerald-500 text-white"
              : "bg-white/90 text-gray-600 border border-gray-200"
            : "bg-red-500 text-white"
          }
          animate-[slideDown_0.3s_ease-out]
        `}
      >
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${status === "syncing" ? "animate-spin" : ""}`} />
        <span>{getMessage()}</span>
        {status === "success" && result?.created ? (
          <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
            +{result.created}
          </span>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
