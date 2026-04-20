"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

export function AutoSync() {
  const syncingRef = useRef(false);
  const registeredRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Minimum 2 minutes between syncs to avoid spamming
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

    // Respect minimum interval between syncs
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
    try {
      const res = await fetch(`/api/sync?maxEmails=${maxEmails}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.results?.some((r: { created?: number }) => (r.created ?? 0) > 0)) {
        window.dispatchEvent(new CustomEvent("transactions-updated"));
      }
    } catch {
      // Silently fail
    } finally {
      syncingRef.current = false;
    }
  }, [refreshAndStoreToken, MIN_SYNC_INTERVAL]);

  // Calculate how many emails to fetch based on days since last sync
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
    // Sync on app open — adaptive based on days since last sync
    const initialSync = setTimeout(async () => {
      const max = await getAdaptiveMax();
      sync(max);
    }, 2000);

    // Sync when user returns to the app
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync(20);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic sync every 2 minutes
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

  return null;
}
