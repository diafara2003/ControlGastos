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
  const [saving, setSaving] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar transacción</DialogTitle>
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

          <div>
            <label className="text-sm font-medium text-gray-700">
              Categoría
            </label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[10px] text-gray-400">
              Cambiar la categoría crea una regla automática para futuras transacciones
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
              disabled={saving || !merchant.trim()}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
