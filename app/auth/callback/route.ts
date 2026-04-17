import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_param = searchParams.get("error");
  const error_desc = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // Log auth errors
  if (error_param) {
    console.error("Auth callback error:", error_param, error_desc);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_param)}&desc=${encodeURIComponent(error_desc ?? "")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Code exchange error:", error.message);
  }

  // If no code, the token might be in the hash fragment.
  // Serve a page that extracts it client-side and redirects.
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Autenticando...</title></head>
      <body>
        <p>Autenticando...</p>
        <script>
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            // Supabase client-side will pick up the hash automatically
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/login?error=auth';
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
