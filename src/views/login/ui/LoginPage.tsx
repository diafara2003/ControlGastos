"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/src/features/auth";
import { APP_NAME, APP_DESCRIPTION } from "@/src/shared/config/constants";
import { createClient } from "@/src/shared/api/supabase/client";

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
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
      <div className="mb-8 text-center">
        <div className="mb-3 text-4xl">💰</div>
        <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-gray-500">{APP_DESCRIPTION}</p>
      </div>
      <LoginForm />
    </div>
  );
}
