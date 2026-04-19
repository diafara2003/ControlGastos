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
  const [type, setType] = useState<"expense" | "income">(transaction.type as "expense" | "income");
  const [transactionDate, setTransactionDate] = useState(
    transaction.transaction_date.slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        transaction_date: new Date(transactionDate + "T12:00:00").toISOString(),
        classification_method: "manual",
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
      <DialogContent>
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
              <label className="text-sm font-medium text-gray-700">
                Monto
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Tipo
              </label>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as "expense" | "income")}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Fecha
            </label>
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
            <p className="mt-1 text-[10px] text-gray-400">
              Cambiar la categoria crea una regla automatica para futuras transacciones
            </p>
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
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Marcar como verificada</span>
          </label>

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
