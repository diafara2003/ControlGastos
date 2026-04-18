import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS.
 * Only use in server-side code (API routes, cron).
 */
export function createServiceClient() {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    key
  );
}
