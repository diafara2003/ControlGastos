"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, signOut } from "../api/authApi";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  return { signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut, loading, error };
}
