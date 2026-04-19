"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/shared/api/supabase/client";
import { formatCOP } from "@/src/shared/lib/currency";
import { Banknote, ChevronRight } from "lucide-react";
import { getUntrackedCards, isUntracked } from "@/src/shared/lib/untracked-cards";

export function WithdrawalAlert() {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: retiroCat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .in("name", ["Retiro cajero", "Efectivo"]);
      const catIds = retiroCat?.map((c) => c.id) ?? [];

      const untrackedCards = await getUntrackedCards(user.id);

      const { data: byCat } = catIds.length > 0
        ? await supabase
            .from("transactions")
            .select("id, amount, card_last_four")
            .eq("user_id", user.id)
            .eq("type", "expense")
            .eq("withdrawal_resolved", false)
            .in("category_id", catIds)
        : { data: [] };

      const { data: byMerchant } = await supabase
        .from("transactions")
        .select("id, amount, card_last_four")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .eq("withdrawal_resolved", false)
        .or("merchant.ilike.%cajero%,merchant.ilike.%retiro%,merchant.ilike.%atm%,merchant.ilike.%servibanca%");

      const seen = new Set<string>();
      const all = [...(byCat ?? []), ...(byMerchant ?? [])].filter((w) => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        if (isUntracked(w.card_last_four, untrackedCards)) return false;
        return true;
      });

      setCount(all.length);
      setTotal(all.reduce((s, d) => s + d.amount, 0));
    };

    check();
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-30">
      <button
        onClick={() => router.push("/transactions?filter=withdrawals")}
        className="w-full flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg text-left transition-colors active:bg-amber-100"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <Banknote className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            {count === 1
              ? "Tienes un retiro sin detallar"
              : `Tienes ${count} retiros sin detallar`}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            {formatCOP(total)} en efectivo sin registrar
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
      </button>
    </div>
  );
}
