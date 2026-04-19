"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Select } from "@/src/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { Landmark } from "lucide-react";
import { getBankBrand } from "@/src/shared/config/bank-brands";

interface BankAccount {
  id: string;
  identifier: string;
  bank_name: string;
  account_type: string;
  is_tracked: boolean;
  track_expenses: boolean;
  track_income: boolean;
  label: string | null;
  txn_count?: number;
}

export function BankAccountSetup() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-detect: find card_last_four values without bank_accounts
      const { data: txns } = await supabase
        .from("transactions")
        .select("card_last_four, raw_email_snippet")
        .eq("user_id", user.id)
        .not("card_last_four", "is", null);

      if (txns && txns.length > 0) {
        const { data: existingAccounts } = await supabase
          .from("bank_accounts")
          .select("identifier")
          .eq("user_id", user.id);

        const existingIds = new Set(existingAccounts?.map((a) => a.identifier) ?? []);
        const newCards = new Map<string, string>();

        for (const t of txns) {
          if (t.card_last_four && !existingIds.has(t.card_last_four) && !newCards.has(t.card_last_four)) {
            // Try to detect bank from email snippet
            const snippet = (t.raw_email_snippet ?? "").toLowerCase();
            let bankName = "";
            if (snippet.includes("bancolombia")) bankName = "bancolombia";
            else if (snippet.includes("caja social") || snippet.includes("cajasocial")) bankName = "bancocajasocial";
            else if (snippet.includes("davivienda")) bankName = "davivienda";
            else if (snippet.includes("bbva")) bankName = "bbva";
            else if (snippet.includes("nequi")) bankName = "nequi";
            else if (snippet.includes("nu ") || snippet.includes("nu.com")) bankName = "nu";
            newCards.set(t.card_last_four, bankName);
          }
        }

        if (newCards.size > 0) {
          const inserts = Array.from(newCards.entries()).map(([identifier, bank]) => ({
            user_id: user.id,
            identifier,
            bank_name: bank,
            is_tracked: true,
            track_expenses: true,
            track_income: true,
          }));
          await supabase.from("bank_accounts").insert(inserts).select();
        }
      }

      // Now load all bank accounts
      const { data } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (!data || data.length < 2) return;

      const needsSetup = data.some((a) => !a.label);
      if (!needsSetup) return;

      // Count transactions per account (by card_last_four since bank_account_id may not be linked yet)
      const withCounts = await Promise.all(
        data.map(async (acc) => {
          const { count } = await supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("card_last_four", acc.identifier);
          return { ...acc, txn_count: count ?? 0 };
        })
      );

      setAccounts(withCounts);
      setOpen(true);
    };

    const timer = setTimeout(check, 4000);
    return () => clearTimeout(timer);
  }, []);

  const updateAccount = (id: string, updates: Partial<BankAccount>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    for (const acc of accounts) {
      await supabase
        .from("bank_accounts")
        .update({
          label: acc.label || `Cuenta *${acc.identifier}`,
          account_type: acc.account_type,
          is_tracked: acc.is_tracked,
          track_expenses: acc.track_expenses,
          track_income: acc.track_income,
        })
        .eq("id", acc.id);
    }

    setSaving(false);
    setOpen(false);
  };

  if (accounts.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-violet-500" />
            Detectamos varias cuentas
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-2">
          Configura cada cuenta para que los indicadores reflejen solo lo que te
          interesa.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const brand = getBankBrand(acc.bank_name);
                    return (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: brand.bgColor, color: brand.textColor }}
                      >
                        {brand.initials}
                      </div>
                    );
                  })()}
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      *{acc.identifier}
                    </span>
                    {acc.bank_name && (
                      <p className="text-[11px] text-gray-400">
                        {getBankBrand(acc.bank_name).name}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400">
                  {acc.txn_count ?? 0} movimientos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500">Nombre</label>
                  <Input
                    value={acc.label ?? ""}
                    onChange={(e) =>
                      updateAccount(acc.id, { label: e.target.value })
                    }
                    placeholder="Ej: Cuenta principal"
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Tipo</label>
                  <Select
                    value={acc.account_type}
                    onChange={(e) =>
                      updateAccount(acc.id, { account_type: e.target.value })
                    }
                    className="text-sm h-8"
                  >
                    <option value="savings">Ahorros</option>
                    <option value="credit">Crédito</option>
                    <option value="other">Otra</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={acc.is_tracked}
                    onChange={(e) =>
                      updateAccount(acc.id, { is_tracked: e.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                  />
                  <span className="text-xs text-gray-700">
                    Incluir en indicadores
                  </span>
                </label>
                {acc.is_tracked && (
                  <div className="ml-5 flex gap-4">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={acc.track_expenses}
                        onChange={(e) =>
                          updateAccount(acc.id, {
                            track_expenses: e.target.checked,
                          })
                        }
                        className="h-3 w-3 rounded border-gray-300 text-rose-500"
                      />
                      <span className="text-[11px] text-gray-600">Gastos</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={acc.track_income}
                        onChange={(e) =>
                          updateAccount(acc.id, {
                            track_income: e.target.checked,
                          })
                        }
                        className="h-3 w-3 rounded border-gray-300 text-emerald-500"
                      />
                      <span className="text-[11px] text-gray-600">
                        Ingresos
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
