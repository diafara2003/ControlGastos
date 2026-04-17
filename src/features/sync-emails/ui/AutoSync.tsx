"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AutoSync() {
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);

  const registerOutlookIfNeeded = useCallback(async () => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check if user logged in with Azure and has provider_token
    const provider = session.user.app_metadata?.provider;
    if (provider !== "azure" || !session.provider_token) return;

    const userEmail = session.user.email;
    if (!userEmail) return;

    // Check if already registered
    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("email", userEmail)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Auto-register Outlook account
    await supabase.from("email_accounts").insert({
      user_id: session.user.id,
      provider: "outlook",
      email: userEmail,
      is_active: true,
    });
  }, []);

  const sync = useCallback(async () => {
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
      await fetch("/api/sync", { method: "POST" });
    } catch {
      // Silently fail
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Auto-register Outlook if user logged in with Microsoft
    registerOutlookIfNeeded();

    // Sync once on mount
    const initialSync = setTimeout(sync, 3000);

    // Then sync every 5 minutes
    intervalRef.current = setInterval(sync, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialSync);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync, registerOutlookIfNeeded]);

  return null;
}
