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
import type { Category } from "@/src/entities/category";

interface AddTransactionFormProps {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddTransactionForm({
  categories,
  open,
  onOpenChange,
  onAdded,
}: AddTransactionFormProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amountNum || !merchant.trim()) return;

    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount: amountNum,
      merchant: merchant.trim(),
      category_id: categoryId || null,
      transaction_date: new Date(date + "T12:00:00").toISOString(),
      classification_method: "manual",
      is_verified: true,
      notes: notes || null,
    });

    if (!error) {
      // Reset form
      setAmount("");
      setMerchant("");
      setCategoryId("");
      setNotes("");
      setType("expense");
      onAdded();
      onOpenChange(false);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar transacción</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === "expense"
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === "income"
                  ? "bg-green-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Ingreso
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Monto (COP)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="50000"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setAmount(val);
              }}
            />
            {amount && (
              <p className="mt-0.5 text-xs text-gray-400">
                $
                {parseInt(amount || "0").toLocaleString("es-CO")}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Comercio / Descripción
            </label>
            <Input
              placeholder="Ej: Restaurante, Uber, Efectivo..."
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
              <option value="">Seleccionar...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fecha</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={2}
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
              disabled={saving || !merchant.trim() || !amount}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Agregar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
