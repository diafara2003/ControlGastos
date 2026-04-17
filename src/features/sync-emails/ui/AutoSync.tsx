"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

const QUICK_INTERVAL = 5 * 1000; // 5 seconds for quick checks

export function AutoSync() {
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);
  const initialDoneRef = useRef(false);

  const registerOutlookIfNeeded = useCallback(async () => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const provider = session.user.app_metadata?.provider;
    if (provider !== "azure" || !session.provider_token) return;

    const userEmail = session.user.email;
    if (!userEmail) return;

    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("email", userEmail)
      .limit(1);

    if (existing && existing.length > 0) return;

    await supabase.from("email_accounts").insert({
      user_id: session.user.id,
      provider: "outlook",
      email: userEmail,
      is_active: true,
    });
  }, []);

  const sync = useCallback(async (maxEmails: number) => {
    if (syncingRef.current) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
  }, []);

  useEffect(() => {
    registerOutlookIfNeeded();

    // Initial sync: last 20 emails after 2 seconds
    const initialSync = setTimeout(async () => {
      await sync(20);
      initialDoneRef.current = true;
    }, 2000);

    // Quick sync every 5 seconds: last 2 emails
    intervalRef.current = setInterval(() => {
      if (initialDoneRef.current) {
        sync(2);
      }
    }, QUICK_INTERVAL);

    return () => {
      clearTimeout(initialSync);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync, registerOutlookIfNeeded]);

  return null;
}
