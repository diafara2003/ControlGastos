"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/src/shared/api/supabase/client";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AutoSync() {
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has any email accounts connected
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
      // Silently fail — will retry next interval
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Sync once on mount (if last sync was > 5 min ago)
    const initialSync = setTimeout(sync, 3000);

    // Then sync every 5 minutes
    intervalRef.current = setInterval(sync, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialSync);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sync]);

  return null;
}
