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

  useEffect(() => {
    // Sync on app open (after 2s to let the UI load)
    const initialSync = setTimeout(() => sync(20), 2000);

    // Sync when user returns to the app (tab/app becomes visible again)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync(10);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic sync every 2 minutes (ensures mobile stays updated)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sync(5);
      }
    }, 2 * 60 * 1000);

    return () => {
      clearTimeout(initialSync);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sync]);

  return null;
}
