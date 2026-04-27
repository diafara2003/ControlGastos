export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";
import { syncAllAccounts } from "@/app/api/cron/sync-emails/route";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const maxEmails = parseInt(searchParams.get("maxEmails") ?? "20", 10);

  return syncAllAccounts(user.id, maxEmails);
}
