"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { formatCOP } from "@/src/shared/lib/currency";
import { Banknote, X } from "lucide-react";

interface PendingWithdrawal {
  id: string;
  amount: number;
  merchant: string;
  transaction_date: string;
}

export function WithdrawalAlert() {
  const [pending, setPending] = useState<PendingWithdrawal[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find unresolved cash withdrawals (category "Efectivo" or merchant contains "cajero/retiro")
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, merchant, transaction_date")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .eq("withdrawal_resolved", false)
        .or("merchant.ilike.%cajero%,merchant.ilike.%retiro%,merchant.ilike.%atm%")
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setPending(data);
      }
    };

    const timer = setTimeout(check, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (pending.length === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-30 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <Banknote className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {pending.length === 1
              ? "Tienes un retiro sin detallar"
              : `Tienes ${pending.length} retiros sin detallar`}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            {formatCOP(pending.reduce((s, p) => s + p.amount, 0))} en efectivo
            sin registrar en que se uso
          </p>
          <p className="text-[10px] text-amber-500 mt-1">
            Toca un retiro en Movimientos para agregar los detalles
          </p>
        </div>
      </div>
    </div>
  );
}
