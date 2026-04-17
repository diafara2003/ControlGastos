import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";
import { encrypt } from "@/src/shared/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=gmail_auth`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Get user email
    const userInfo = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    ).then((r) => r.json());

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Encrypt tokens with AES-256-GCM
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    await supabase.from("email_accounts").upsert(
      {
        user_id: user.id,
        provider: "gmail",
        email: userInfo.email,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        is_active: true,
      },
      { onConflict: "user_id,provider,email" }
    );

    return NextResponse.redirect(`${origin}/settings?success=gmail`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(`${origin}/settings?error=gmail_token`);
  }
}
