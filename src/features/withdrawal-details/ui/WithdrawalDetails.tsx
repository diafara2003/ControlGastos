"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { formatCOP } from "@/src/shared/lib/currency";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Spinner } from "@/src/shared/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Transaction } from "@/src/entities/transaction";

interface WithdrawalDetail {
  id: string;
  description: string;
  amount: number;
}

interface WithdrawalDetailsProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function WithdrawalDetailsModal({
  transaction,
  open,
  onOpenChange,
  onUpdated,
}: WithdrawalDetailsProps) {
  const [details, setDetails] = useState<WithdrawalDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalDetailed = details.reduce((s, d) => s + d.amount, 0);
  const remaining = transaction.amount - totalDetailed;
  const isResolved = remaining <= 0;

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("withdrawal_details")
        .select("id, description, amount")
        .eq("transaction_id", transaction.id)
        .order("created_at");
      setDetails(data ?? []);
      setLoading(false);
    };
    load();
  }, [open, transaction.id]);

  const addDetail = async () => {
    const amount = parseInt(newAmount.replace(/\D/g, ""), 10);
    if (!newDesc.trim() || !amount || amount <= 0) return;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("withdrawal_details")
      .insert({
        transaction_id: transaction.id,
        user_id: user.id,
        description: newDesc.trim(),
        amount,
      })
      .select("id, description, amount")
      .single();

    if (data) {
      const updated = [...details, data];
      setDetails(updated);
      setNewDesc("");
      setNewAmount("");

      // Check if resolved
      const newTotal = updated.reduce((s, d) => s + d.amount, 0);
      if (newTotal >= transaction.amount) {
        await supabase
          .from("transactions")
          .update({ withdrawal_resolved: true })
          .eq("id", transaction.id);
        window.dispatchEvent(new CustomEvent("transactions-updated"));
      }
    }

    setSaving(false);
  };

  const removeDetail = async (id: string) => {
    const supabase = createClient();
    await supabase.from("withdrawal_details").delete().eq("id", id);
    const updated = details.filter((d) => d.id !== id);
    setDetails(updated);

    // Recheck resolved status
    const newTotal = updated.reduce((s, d) => s + d.amount, 0);
    if (newTotal < transaction.amount) {
      await supabase
        .from("transactions")
        .update({ withdrawal_resolved: false })
        .eq("id", transaction.id);
      window.dispatchEvent(new CustomEvent("transactions-updated"));
    }
  };

  const formatInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("es-CO");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && onUpdated) onUpdated(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del retiro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Retiro total</span>
              <span className="font-bold text-gray-900">
                {formatCOP(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Detallado</span>
              <span className="font-semibold text-violet-600">
                {formatCOP(totalDetailed)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isResolved ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{
                  width: `${Math.min(
                    (totalDetailed / transaction.amount) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {isResolved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">
                    Retiro completamente detallado
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">
                    Faltan {formatCOP(remaining)} por registrar
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Details list */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <div className="space-y-2">
              {details.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {d.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCOP(d.amount)}
                    </span>
                    <button
                      onClick={() => removeDetail(d.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {details.length === 0 && !loading && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No has registrado en que usaste este retiro
                </p>
              )}
            </div>
          )}

          {/* Add new detail */}
          {!isResolved && (
            <div className="flex gap-2">
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ej: Mercado, taxi..."
                className="flex-1 text-sm h-9"
              />
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  $
                </span>
                <Input
                  value={formatInput(newAmount)}
                  onChange={(e) => setNewAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="Monto"
                  className="pl-5 text-sm h-9"
                />
              </div>
              <Button
                size="sm"
                onClick={addDetail}
                disabled={saving || !newDesc.trim() || !newAmount}
                className="h-9 px-3"
              >
                {saving ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
