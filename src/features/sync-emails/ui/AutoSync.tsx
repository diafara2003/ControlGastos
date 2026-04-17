"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

const QUICK_INTERVAL = 5 * 1000; // 5 seconds

export function AutoSync() {
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);
  const initialDoneRef = useRef(false);

  const refreshAndStoreToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const provider = session.user.app_metadata?.provider;
    const userEmail = session.user.email;
    if (!userEmail) return;

    // For Azure users: update provider token on every sync
    if (provider === "azure" && session.provider_token) {
      const { data: existing } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("email", userEmail)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("email_accounts")
          .update({ provider_token_encrypted: session.provider_token })
          .eq("email", userEmail);
      } else if (!registeredRef.current) {
        await supabase.from("email_accounts").insert({
          user_id: session.user.id,
          provider: "outlook",
          email: userEmail,
          provider_token_encrypted: session.provider_token,
          is_active: true,
        });
      }
      registeredRef.current = true;
    }
  }, []);

  const sync = useCallback(async (maxEmails: number) => {
    if (syncingRef.current) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Refresh token before syncing
    await refreshAndStoreToken();

    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    if (!accounts || accounts.length === 0) return;

    syncingRef.current = true;
    try {
      await fetch(`/api/sync?maxEmails=${maxEmails}`, { method: "POST" });
    } catch {
      // Silently fail
    } finally {
      syncingRef.current = false;
    }
  }, [refreshAndStoreToken]);

  useEffect(() => {
    const initialSync = setTimeout(async () => {
      await sync(20);
      initialDoneRef.current = true;
    }, 2000);

    intervalRef.current = setInterval(() => {
      if (initialDoneRef.current) {
        sync(2);
      }
    }, QUICK_INTERVAL);

    return () => {
      clearTimeout(initialSync);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync]);

  return null;
}
