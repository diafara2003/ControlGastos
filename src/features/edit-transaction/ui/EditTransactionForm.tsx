"use client";

import { useState } from "react";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Textarea } from "@/src/shared/ui/textarea";
import { Select } from "@/src/shared/ui/select";
import { Spinner } from "@/src/shared/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { createClient } from "@/src/shared/api/supabase/client";
import type { Transaction } from "@/src/entities/transaction";
import type { Category } from "@/src/entities/category";
import { BookOpen, ChevronRight } from "lucide-react";

interface EditTransactionFormProps {
  transaction: Transaction;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditTransactionForm({
  transaction,
  categories,
  open,
  onOpenChange,
  onSaved,
}: EditTransactionFormProps) {
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [isVerified, setIsVerified] = useState(transaction.is_verified);
  const [amount, setAmount] = useState(transaction.amount);
  const [type, setType] = useState<"expense" | "income">(
    transaction.type as "expense" | "income"
  );
  const [transactionDate, setTransactionDate] = useState(
    transaction.transaction_date.slice(0, 10)
  );
  const [excludeFromTotals, setExcludeFromTotals] = useState(
    (transaction as Transaction & { exclude_from_totals?: boolean })
      .exclude_from_totals ?? false
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Rule section
  const [showRule, setShowRule] = useState(false);
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleIncludeExpenses, setRuleIncludeExpenses] = useState(true);
  const [ruleIncludeIncome, setRuleIncludeIncome] = useState(true);
  const [saveRule, setSaveRule] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("transactions")
      .update({
        category_id: categoryId || null,
        merchant,
        notes: notes || null,
        is_verified: isVerified,
        amount,
        type,
        transaction_date: new Date(
          transactionDate + "T12:00:00"
        ).toISOString(),
        classification_method: "manual",
        exclude_from_totals: excludeFromTotals,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (!error) {
      // Learn from category corrections (global pattern)
      if (categoryId && categoryId !== transaction.category_id) {
        const newCategory = categories.find((c) => c.id === categoryId);
        if (newCategory) {
          await fetch("/api/learn-pattern", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchant: transaction.merchant,
              categoryName: newCategory.name,
            }),
          }).catch(() => {});
        }
      }

      // Save user rule if requested — also reclassifies existing matches
      if (saveRule) {
        const newCategory = categories.find((c) => c.id === categoryId);
        await fetch("/api/save-user-rule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant,
            categoryName: newCategory?.name ?? "Otros",
            ruleDescription,
            includeInExpenses: ruleIncludeExpenses,
            includeInIncome: ruleIncludeIncome,
          }),
        }).catch(() => {});
        // Reclassification happened server-side, refresh everything
        window.dispatchEvent(new CustomEvent("transactions-updated"));
      }

      onSaved();
      onOpenChange(false);
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar esta transacción? Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id);

    if (!error) {
      onSaved();
      onOpenChange(false);
    }

    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar transaccion</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Comercio
            </label>
            <Input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Monto</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <Select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "expense" | "income")
                }
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fecha</label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Categoria
            </label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar nota..."
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeFromTotals}
              onChange={(e) => setExcludeFromTotals(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">
              No incluir en totales
            </span>
          </label>

          {/* Rule section - collapsible */}
          <div className="rounded-lg border border-violet-200 bg-violet-50/50">
            <button
              type="button"
              onClick={() => {
                setShowRule(!showRule);
                if (!showRule) setSaveRule(true);
              }}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-violet-700">
                  Crear regla para el futuro
                </span>
              </div>
              <ChevronRight
                className={`h-4 w-4 text-violet-400 transition-transform duration-200 ${
                  showRule ? "rotate-90" : ""
                }`}
              />
            </button>

            {showRule && (
              <div className="px-3 pb-3 space-y-3 border-t border-violet-200 pt-3">
                <p className="text-[11px] text-violet-600">
                  Cuando aparezca &quot;{merchant}&quot; en el futuro, aplicar
                  esta regla automáticamente.
                </p>

                <div>
                  <label className="text-[11px] text-gray-500">
                    Descripcion de la regla
                  </label>
                  <Input
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="Ej: Pago de fondo, no contar como gasto"
                    className="text-sm h-8"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={ruleIncludeExpenses}
                      onChange={(e) =>
                        setRuleIncludeExpenses(e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-rose-500"
                    />
                    <span className="text-xs text-gray-700">
                      Sumar a gastos
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={ruleIncludeIncome}
                      onChange={(e) =>
                        setRuleIncludeIncome(e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-500"
                    />
                    <span className="text-xs text-gray-700">
                      Sumar a ingresos
                    </span>
                  </label>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saveRule}
                    onChange={(e) => setSaveRule(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                  />
                  <span className="text-xs text-gray-700">
                    Guardar regla para futuros movimientos similares
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || deleting || !merchant.trim()}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar"}
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? <Spinner className="h-4 w-4" /> : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
