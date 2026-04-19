"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/shared/api/supabase/client";
import { useAuth } from "@/src/features/auth";
import { APP_NAME } from "@/src/shared/config/constants";
import { formatCOP } from "@/src/shared/lib/currency";
import { formatShortDate } from "@/src/shared/lib/date";
import { LogOut, User, Bell, Banknote, PiggyBank } from "lucide-react";
import { getUntrackedCards, isUntracked } from "@/src/shared/lib/untracked-cards";

interface Notification {
  id: string;
  type: "withdrawal" | "savings";
  title: string;
  description: string;
  url: string;
}

export function AppHeader() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string | null;
    avatar: string | null;
    email: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

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

  // Load notifications
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;

      const notifs: Notification[] = [];

      // Pending withdrawals — by category + merchant keywords
      const { data: retiroCat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", u.id)
        .in("name", ["Retiro cajero", "Efectivo"]);

      const retiroCatIds = retiroCat?.map((c) => c.id) ?? [];
      const untrackedCards = await getUntrackedCards(u.id);

      const { data: wByCat } = retiroCatIds.length > 0
        ? await supabase
            .from("transactions")
            .select("id, amount, merchant, transaction_date, card_last_four")
            .eq("user_id", u.id)
            .eq("type", "expense")
            .eq("withdrawal_resolved", false)
            .in("category_id", retiroCatIds)
            .order("transaction_date", { ascending: false })
            .limit(5)
        : { data: [] };

      const { data: wByMerchant } = await supabase
        .from("transactions")
        .select("id, amount, merchant, transaction_date, card_last_four")
        .eq("user_id", u.id)
        .eq("type", "expense")
        .eq("withdrawal_resolved", false)
        .or("merchant.ilike.%cajero%,merchant.ilike.%retiro%,merchant.ilike.%atm%,merchant.ilike.%servibanca%")
        .order("transaction_date", { ascending: false })
        .limit(5);

      const seen = new Set<string>();
      for (const w of [...(wByCat ?? []), ...(wByMerchant ?? [])]) {
        if (seen.has(w.id)) continue;
        seen.add(w.id);
        if (isUntracked(w.card_last_four, untrackedCards)) continue;
        notifs.push({
          id: `w-${w.id}`,
          type: "withdrawal",
          title: "Retiro sin detallar",
          description: `${formatCOP(w.amount)} — ${w.merchant} · ${formatShortDate(w.transaction_date)}`,
          url: "/transactions?filter=withdrawals",
        });
      }

      // Savings goal not set
      const { data: profile } = await supabase
        .from("profiles")
        .select("savings_goal")
        .eq("id", u.id)
        .single();

      if (profile && profile.savings_goal == null) {
        // Check if there's income this month (nómina arrived)
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
            description: "Tu ingreso llegó — define cuánto quieres ahorrar este mes",
            url: "/dashboard",
          });
        }
      }

      setNotifications(notifs);
    };

    const timer = setTimeout(load, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (bellOpen && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, bellOpen]);

  const handleNotifClick = (notif: Notification) => {
    setBellOpen(false);
    router.push(notif.url);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-3 pb-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100/50 dark:border-slate-800/50 mx-auto max-w-lg md:hidden">
      <span className="text-sm font-bold text-emerald-600 tracking-tight">
        {APP_NAME}
      </span>

      <div className="flex items-center gap-1">
        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-gray-100"
          >
            <Bell className="h-[18px] w-[18px] text-gray-500" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg animate-fade-up overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-700">Notificaciones</p>
              </div>
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-gray-400">Todo al día</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                        n.type === "withdrawal" ? "bg-amber-50" : "bg-violet-50"
                      }`}>
                        {n.type === "withdrawal" ? (
                          <Banknote className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <PiggyBank className="h-3.5 w-3.5 text-violet-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800">{n.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {n.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            className="flex items-center gap-2 rounded-full py-0.5 pl-2 pr-0.5 transition-all hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-95"
          >
            {user?.name && (
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300 max-w-[100px] truncate">
                {user.name.split(" ")[0]}
              </span>
            )}
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
            <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-lg animate-fade-up">
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
      </div>
    </header>
  );
}
