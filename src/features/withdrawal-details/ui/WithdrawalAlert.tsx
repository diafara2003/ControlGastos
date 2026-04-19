"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/shared/api/supabase/client";
import { formatCOP } from "@/src/shared/lib/currency";
import { Banknote, X, ChevronRight } from "lucide-react";

export function WithdrawalAlert() {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .eq("withdrawal_resolved", false)
        .or("merchant.ilike.%cajero%,merchant.ilike.%retiro%,merchant.ilike.%atm%,merchant.ilike.%servibanca%");

      if (data && data.length > 0) {
        setCount(data.length);
        setTotal(data.reduce((s, d) => s + d.amount, 0));
      }
    };

    const timer = setTimeout(check, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (count === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-30 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        onClick={() => {
          setDismissed(true);
          router.push("/transactions?filter=withdrawals");
        }}
        className="flex items-start gap-3 w-full text-left"
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
        <ChevronRight className="h-4 w-4 text-amber-400 mt-1 shrink-0" />
      </button>
    </div>
  );
}
