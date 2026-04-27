"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  updatePrestamo,
  deletePrestamo,
  addPayment,
  deletePayment,
} from "@/src/entities/prestamo";
import type { Prestamo } from "@/src/entities/prestamo";
import { formatCOP, formatCOPInput, rawDigits } from "@/src/shared/lib/currency";
import { formatShortDate } from "@/src/shared/lib/date";

interface EditPrestamoFormProps {
  prestamo: Prestamo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditPrestamoForm({
  prestamo,
  open,
  onOpenChange,
  onUpdated,
}: EditPrestamoFormProps) {
  const [contactName, setContactName] = useState(prestamo.contact_name);
  const [expectedDate, setExpectedDate] = useState(
    prestamo.expected_return_date
      ? new Date(prestamo.expected_return_date).toISOString().split("T")[0]
      : ""
  );
  const [notes, setNotes] = useState(prestamo.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const payments = prestamo.payments ?? [];
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = prestamo.amount - totalPaid;
  const progressPct = prestamo.amount > 0 ? (totalPaid / prestamo.amount) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrestamo(prestamo.id, {
        contact_name: contactName.trim(),
        expected_return_date: expectedDate
          ? new Date(expectedDate + "T12:00:00").toISOString()
          : null,
        notes: notes || null,
      });
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating prestamo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    const amountNum = parseInt(paymentAmount.replace(/\D/g, ""), 10);
    if (!amountNum) return;

    setAddingPayment(true);
    try {
      await addPayment({
        prestamo_id: prestamo.id,
        amount: amountNum,
        payment_date: new Date(paymentDate + "T12:00:00").toISOString(),
        notes: paymentNotes || null,
      });
      setPaymentAmount("");
      setPaymentNotes("");
      onUpdated();
    } catch (err) {
      console.error("Error adding payment:", err);
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId, prestamo.id);
      onUpdated();
    } catch (err) {
      console.error("Error deleting payment:", err);
    }
  };

  const handleMarkCompleted = async () => {
    setSaving(true);
    try {
      await updatePrestamo(prestamo.id, { status: "completed" });
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error("Error marking completed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePrestamo(prestamo.id);
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting prestamo:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {prestamo.type === "dado" ? "Préstamo dado" : "Préstamo recibido"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="rounded-xl bg-gray-50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Progreso</span>
              <span className="font-medium text-gray-800">
                {formatCOP(totalPaid)} / {formatCOP(prestamo.amount)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 100
                    ? "bg-emerald-500"
                    : progressPct > 0
                      ? "bg-blue-500"
                      : "bg-gray-300"
                }`}
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
            {remaining > 0 && (
              <p className="text-xs text-gray-400">
                Falta: {formatCOP(remaining)}
              </p>
            )}
          </div>

          {/* Edit fields */}
          <div>
            <label className="text-sm font-medium text-gray-700">Contacto</label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Fecha esperada de pago
            </label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || !contactName.trim()}>
            {saving ? <Spinner className="h-4 w-4" /> : "Guardar cambios"}
          </Button>

          {/* Add payment section */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Agregar abono</h3>
            <div className="space-y-3">
              <div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Monto del abono"
                  value={formatCOPInput(paymentAmount)}
                  onChange={(e) => setPaymentAmount(rawDigits(e.target.value))}
                />
              </div>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <Input
                placeholder="Nota del abono (opcional)"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddPayment}
                disabled={addingPayment || !paymentAmount}
              >
                {addingPayment ? <Spinner className="h-4 w-4" /> : "Registrar abono"}
              </Button>
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Historial de abonos ({payments.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {payments
                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 tabular-nums">
                          {formatCOP(p.amount)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {formatShortDate(p.payment_date)}
                          {p.notes && ` — ${p.notes}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            {prestamo.status !== "completed" && (
              <Button
                variant="outline"
                className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={handleMarkCompleted}
                disabled={saving}
              >
                Marcar como pagado completo
              </Button>
            )}

            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Spinner className="h-4 w-4" /> : "Confirmar eliminar"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Eliminar préstamo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
