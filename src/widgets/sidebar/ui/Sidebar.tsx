"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings, LogOut, Wallet, User } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";
import { APP_NAME } from "@/src/shared/config/constants";
import { useAuth } from "@/src/features/auth";
import { createClient } from "@/src/shared/api/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: Receipt },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [user, setUser] = useState<{
    name: string | null;
    avatar: string | null;
    email: string;
  } | null>(null);

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

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r border-gray-100 z-40 sidebar-bg">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 pt-6 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-lg shadow-sm">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {APP_NAME}
        </span>
      </div>

      {/* User info */}
      {user && (
        <div className="flex items-center gap-3 mx-3 mb-5 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-slate-800/50">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            {user.name && (
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                {user.name}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">
              {user.email}
            </p>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-emerald-600" : "text-gray-400"
                )}
              />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
