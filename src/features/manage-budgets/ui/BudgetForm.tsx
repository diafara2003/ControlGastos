"use client";

import { useState } from "react";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Select } from "@/src/shared/ui/select";
import { Spinner } from "@/src/shared/ui/spinner";
import { formatCOPInput, rawDigits } from "@/src/shared/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { createClient } from "@/src/shared/api/supabase/client";
import type { Category } from "@/src/entities/category";

interface BudgetFormProps {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  existingBudget?: {
    id: string;
    category_id: string;
    amount_limit: number;
  };
}

export function BudgetForm({
  categories,
  open,
  onOpenChange,
  onSaved,
  existingBudget,
}: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState(
    existingBudget?.category_id ?? ""
  );
  const [amountLimit, setAmountLimit] = useState(
    existingBudget ? String(existingBudget.amount_limit) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const limit = parseInt(amountLimit.replace(/\D/g, ""), 10);
    if (!limit || !categoryId) return;

    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    if (existingBudget) {
      await supabase
        .from("budgets")
        .update({ amount_limit: limit, category_id: categoryId })
        .eq("id", existingBudget.id);
    } else {
      await supabase.from("budgets").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          amount_limit: limit,
          period: "monthly",
        },
        { onConflict: "user_id,category_id,period" }
      );
    }

    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingBudget ? "Editar presupuesto" : "Nuevo presupuesto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Categoría
            </label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {categories
                .filter((c) => c.name !== "Ingresos")
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Límite mensual (COP)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="200.000"
              value={formatCOPInput(amountLimit)}
              onChange={(e) => setAmountLimit(rawDigits(e.target.value))}
            />
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
              disabled={saving || !categoryId || !amountLimit}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
