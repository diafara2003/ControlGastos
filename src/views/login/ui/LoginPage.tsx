"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/src/features/auth";
import { APP_NAME, APP_DESCRIPTION } from "@/src/shared/config/constants";
import { createClient } from "@/src/shared/api/supabase/client";
import { Shield } from "lucide-react";

export function LoginPage() {
  const router = useRouter();

  // Check if already authenticated (e.g. after OAuth redirect)
  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes (picks up token from URL hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          router.push("/dashboard");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 animate-bg-shift relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-100/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-100/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo and branding */}
        <div className="mb-10 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{APP_DESCRIPTION}</p>
        </div>

        {/* Login form card */}
        <div className="animate-fade-up rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6" style={{ animationDelay: "100ms" }}>
          <LoginForm />
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <Shield className="h-3.5 w-3.5" />
          <span>Tus datos estan protegidos con cifrado seguro</span>
        </div>
      </div>
    </div>
  );
}
