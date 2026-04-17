import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";

export const maxDuration = 60;

/**
 * Manual sync trigger from Settings page.
 * Authenticates via Supabase session, then calls the cron endpoint.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to the cron endpoint with CRON_SECRET and userId filter
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(`${appUrl}/api/cron/sync-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ userId: user.id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
