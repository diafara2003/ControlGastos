"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Textarea } from "@/src/shared/ui/textarea";
import { Spinner } from "@/src/shared/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { createPrestamo, getDistinctContacts } from "@/src/entities/prestamo";
import type { PrestamoType } from "@/src/entities/prestamo";

interface AddPrestamoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddPrestamoForm({ open, onOpenChange, onAdded }: AddPrestamoFormProps) {
  const [type, setType] = useState<PrestamoType>("dado");
  const [contactName, setContactName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (open) {
      getDistinctContacts().then(setContacts).catch(() => {});
    }
  }, [open]);

  const filteredContacts = contactName.length > 0
    ? contacts.filter((c) => c.toLowerCase().includes(contactName.toLowerCase()))
    : [];

  const handleSave = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amountNum || !contactName.trim()) return;

    setSaving(true);
    try {
      await createPrestamo({
        type,
        contact_name: contactName.trim(),
        amount: amountNum,
        start_date: new Date(startDate + "T12:00:00").toISOString(),
        expected_return_date: expectedDate
          ? new Date(expectedDate + "T12:00:00").toISOString()
          : null,
        notes: notes || null,
      });
      setAmount("");
      setContactName("");
      setExpectedDate("");
      setNotes("");
      setType("dado");
      onAdded();
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating prestamo:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo préstamo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setType("dado")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === "dado"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Yo presto
            </button>
            <button
              type="button"
              onClick={() => setType("recibido")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === "recibido"
                  ? "bg-violet-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Me prestan
            </button>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-gray-700">Contacto</label>
            <Input
              placeholder="Nombre de la persona"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && filteredContacts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-32 overflow-y-auto">
                {filteredContacts.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onMouseDown={() => {
                      setContactName(c);
                      setShowSuggestions(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Monto (COP)</label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
            {amount && (
              <p className="mt-0.5 text-xs text-gray-400">
                ${parseInt(amount || "0").toLocaleString("es-CO")}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fecha del préstamo</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Fecha esperada de pago (opcional)
            </label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del préstamo..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !contactName.trim() || !amount}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Crear préstamo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
