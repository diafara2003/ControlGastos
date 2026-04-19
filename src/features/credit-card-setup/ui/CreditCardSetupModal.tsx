"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { Button } from "@/src/shared/ui/button";
import { CreditCard, X, Check } from "lucide-react";

const AVAILABLE_CARDS = [
  { bank: "Bancolombia", type: "credit_card" },
  { bank: "Davivienda", type: "credit_card" },
  { bank: "BBVA", type: "credit_card" },
  { bank: "Banco de Bogotá", type: "credit_card" },
  { bank: "Banco de Occidente", type: "credit_card" },
  { bank: "Scotiabank Colpatria", type: "credit_card" },
  { bank: "Banco Popular", type: "credit_card" },
  { bank: "Banco Falabella", type: "credit_card" },
  { bank: "Banco Caja Social", type: "credit_card" },
  { bank: "AV Villas", type: "credit_card" },
  { bank: "Itaú", type: "credit_card" },
  { bank: "Citibank", type: "credit_card" },
  { bank: "Nu", type: "credit_card" },
  { bank: "Addi", type: "bnpl" },
  { bank: "Sistecredito", type: "bnpl" },
];

interface CreditCardSetupModalProps {
  open: boolean;
  onComplete: () => void;
}

export function CreditCardSetupModal({
  open,
  onComplete,
}: CreditCardSetupModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing cards when modal opens
  useEffect(() => {
    if (!open || loaded) return;
    async function loadExisting() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_credit_cards")
        .select("bank_name");
      if (data && data.length > 0) {
        setSelected(new Set(data.map((c) => c.bank_name)));
      }
      setLoaded(true);
    }
    loadExisting();
  }, [open, loaded]);

  // Reset loaded state when modal closes
  useEffect(() => {
    if (!open) setLoaded(false);
  }, [open]);

  if (!open) return null;

  const toggle = (bank: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bank)) next.delete(bank);
      else next.add(bank);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Clear existing and insert selected cards
      await supabase.from("user_credit_cards").delete().eq("user_id", user.id);

      if (selected.size > 0) {
        const cards = AVAILABLE_CARDS.filter((c) => selected.has(c.bank)).map(
          (c) => ({
            user_id: user.id,
            bank_name: c.bank,
            product_type: c.type,
          })
        );
        await supabase.from("user_credit_cards").insert(cards);
      }

      // Mark as configured
      await supabase
        .from("profiles")
        .update({ credit_cards_configured: true })
        .eq("id", user.id);

      onComplete();
    } catch (err) {
      console.error("Error saving credit cards:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNoCards = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ credit_cards_configured: true })
        .eq("id", user.id);

      onComplete();
    } catch (err) {
      console.error("Error saving preference:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Tarjetas de crédito
            </h2>
            <p className="text-xs text-gray-500">
              Selecciona las que manejas para procesar tus extractos
            </p>
          </div>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
          {AVAILABLE_CARDS.map((card) => {
            const isSelected = selected.has(card.bank);
            return (
              <button
                key={card.bank}
                onClick={() => toggle(card.bank)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 bg-white active:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-gray-800">
                    {card.bank}
                  </span>
                  {card.type === "bnpl" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                      Compra ahora, paga después
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="w-full"
          >
            {saving
              ? "Guardando..."
              : `Guardar${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
          <button
            onClick={handleNoCards}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 py-2 transition-colors active:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            No tengo tarjeta de crédito
          </button>
        </div>
      </div>
    </div>
  );
}
