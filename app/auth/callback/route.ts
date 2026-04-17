import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_param = searchParams.get("error");
  const error_desc = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // Use configured app URL or fallback to origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  // Log auth errors from provider
  if (error_param) {
    console.error("Auth callback error:", error_param, error_desc);
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(error_param)}&desc=${encodeURIComponent(error_desc ?? "")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }
    console.error("Code exchange error:", error.message);
    return NextResponse.redirect(
      `${appUrl}/login?error=exchange&desc=${encodeURIComponent(error.message)}`
    );
  }

  // No code — redirect to login
  return NextResponse.redirect(`${appUrl}/login?error=no_code`);
}
