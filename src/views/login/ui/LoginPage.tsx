"use client";

import { LoginForm } from "@/src/features/auth";
import { APP_NAME, APP_DESCRIPTION } from "@/src/shared/config/constants";

export function LoginPage() {
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
