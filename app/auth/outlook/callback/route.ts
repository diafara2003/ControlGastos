import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";
import { encrypt } from "@/src/shared/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=outlook_auth`);
  }

  try {
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          grant_type: "authorization_code",
          scope: "Mail.Read User.Read offline_access",
        }),
      }
    );

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    const userInfo = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => r.json());

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    await supabase.from("email_accounts").upsert(
      {
        user_id: user.id,
        provider: "outlook",
        email: userInfo.mail || userInfo.userPrincipalName,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        is_active: true,
      },
      { onConflict: "user_id,provider,email" }
    );

    return NextResponse.redirect(`${origin}/settings?success=outlook`);
  } catch (err) {
    console.error("Outlook callback error:", err);
    return NextResponse.redirect(`${origin}/settings?error=outlook_token`);
  }
}
