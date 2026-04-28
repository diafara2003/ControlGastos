import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";
import { encrypt } from "@/src/shared/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, providerToken, providerRefreshToken } = await request.json();
  if (!email || !providerToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const updates: Record<string, string> = {
    provider_token_encrypted: encrypt(providerToken),
  };
  if (providerRefreshToken) {
    updates.provider_refresh_token_encrypted = encrypt(providerRefreshToken);
  }

  const { data: existing } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from("email_accounts")
      .update(updates)
      .eq("email", email);
  } else {
    await supabase.from("email_accounts").insert({
      user_id: user.id,
      provider: "outlook",
      email,
      ...updates,
      is_active: true,
    });
  }

  return NextResponse.json({ ok: true });
}
