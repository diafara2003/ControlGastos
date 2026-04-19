"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings, LogOut, Wallet, User, FileBarChart, Bell, Banknote, PiggyBank } from "lucide-react";
import { formatCOP } from "@/src/shared/lib/currency";
import { formatShortDate } from "@/src/shared/lib/date";
import { cn } from "@/src/shared/lib/cn";
import { APP_NAME } from "@/src/shared/config/constants";
import { useAuth } from "@/src/features/auth";
import { createClient } from "@/src/shared/api/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: Receipt },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

interface SidebarNotification {
  id: string;
  type: "withdrawal" | "savings";
  title: string;
  description: string;
  href: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [user, setUser] = useState<{
    name: string | null;
    avatar: string | null;
    email: string;
  } | null>(null);
  const [notifications, setNotifications] = useState<SidebarNotification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUserId(u.id);
        setUser({
          name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
          avatar: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
          email: u.email ?? "",
        });
      }
    });
  }, []);

  // Load notifications - runs on mount and when transactions update
  useEffect(() => {
    if (!userId) return;

    const loadNotifs = async () => {
      const supabase = createClient();
      const u = { id: userId };
          const notifs: SidebarNotification[] = [];
          // Get Retiro cajero category ID
          const { data: retiroCat } = await supabase
            .from("categories")
            .select("id")
            .eq("user_id", u.id)
            .in("name", ["Retiro cajero", "Efectivo"]);

          const retiroCatIds = retiroCat?.map((c) => c.id) ?? [];
          console.log("[Sidebar notifs] user:", u.id, "retiroCatIds:", retiroCatIds);

          // Find unresolved withdrawals by category OR merchant keywords
          const { data: byCategory } = retiroCatIds.length > 0
            ? await supabase
                .from("transactions")
                .select("id, amount, merchant, transaction_date")
                .eq("user_id", u.id)
                .eq("type", "expense")
                .eq("withdrawal_resolved", false)
                .in("category_id", retiroCatIds)
                .order("transaction_date", { ascending: false })
                .limit(5)
            : { data: [] };

          const { data: byMerchant } = await supabase
            .from("transactions")
            .select("id, amount, merchant, transaction_date")
            .eq("user_id", u.id)
            .eq("type", "expense")
            .eq("withdrawal_resolved", false)
            .or("merchant.ilike.%cajero%,merchant.ilike.%retiro%,merchant.ilike.%atm%,merchant.ilike.%servibanca%")
            .order("transaction_date", { ascending: false })
            .limit(5);

          console.log("[Sidebar notifs] byCategory:", byCategory?.length, "byMerchant:", byMerchant?.length);
          // Merge and deduplicate
          const seen = new Set<string>();
          const allWithdrawals = [...(byCategory ?? []), ...(byMerchant ?? [])].filter((w) => {
            if (seen.has(w.id)) return false;
            seen.add(w.id);
            return true;
          });

          for (const w of allWithdrawals) {
            notifs.push({
              id: `w-${w.id}`,
              type: "withdrawal",
              title: "Retiro sin detallar",
              description: `${formatCOP(w.amount)} — ${formatShortDate(w.transaction_date)}`,
              href: "/transactions?filter=withdrawals",
            });
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("savings_goal")
            .eq("id", u.id)
            .single();

          if (profile && profile.savings_goal == null) {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const { count } = await supabase
              .from("transactions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", u.id)
              .eq("type", "income")
              .gte("transaction_date", monthStart);

            if (count && count > 0) {
              notifs.push({
                id: "savings-goal",
                type: "savings",
                title: "Meta de ahorro",
                description: "Define cuánto quieres ahorrar",
                href: "/dashboard",
              });
            }
          }

      setNotifications(notifs);
    };

    loadNotifs();

    // Refresh when transactions are updated (e.g., withdrawal resolved)
    const handler = () => loadNotifs();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, [userId]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r border-gray-100 z-40 sidebar-bg">
      {/* Logo + Bell */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-lg shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <button
          onClick={() => setBellOpen(!bellOpen)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-[18px] w-[18px] text-gray-400" />
          {notifications.length > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Notification dropdown */}
      {bellOpen && (
        <div className="mx-3 mb-3 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-gray-400">Todo al dia</p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setBellOpen(false)}
                  className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 mt-0.5 ${
                    n.type === "withdrawal" ? "bg-amber-50" : "bg-violet-50"
                  }`}>
                    {n.type === "withdrawal" ? (
                      <Banknote className="h-3 w-3 text-amber-600" />
                    ) : (
                      <PiggyBank className="h-3 w-3 text-violet-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">{n.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{n.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

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
