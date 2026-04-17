"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { useAuth } from "@/src/features/auth";
import { APP_NAME } from "@/src/shared/config/constants";
import { LogOut, User } from "lucide-react";

export function AppHeader() {
  const { signOut } = useAuth();
  const [user, setUser] = useState<{
    name: string | null;
    avatar: string | null;
    email: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
          avatar: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
          email: u.email ?? "",
        });
      }
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-3 pb-2 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 mx-auto max-w-lg md:hidden">
      <span className="text-sm font-bold text-emerald-600 tracking-tight">
        {APP_NAME}
      </span>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-full p-0.5 transition-all hover:ring-2 hover:ring-emerald-200 active:scale-95"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <User className="h-4 w-4" />
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-100 bg-white p-1 shadow-lg animate-fade-up">
            <div className="px-3 py-2 border-b border-gray-50">
              {user?.name && (
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
              )}
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 mt-1 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
