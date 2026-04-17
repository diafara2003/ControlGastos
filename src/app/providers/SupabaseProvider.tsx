"use client";

import { createContext, useContext, useRef } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<SupabaseClient | null>(null);

  if (typeof window !== "undefined" && !clientRef.current) {
    clientRef.current = createClient();
  }

  return (
    <SupabaseContext.Provider value={clientRef.current}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used within SupabaseProvider");
  return ctx;
}
