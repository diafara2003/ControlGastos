"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Handshake, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getPrestamos } from "@/src/entities/prestamo";
import type { Prestamo, PrestamoType, PrestamoStatus } from "@/src/entities/prestamo";
import { AddPrestamoForm } from "@/src/features/add-prestamo";
import { EditPrestamoForm } from "@/src/features/edit-prestamo";
import { formatCOP } from "@/src/shared/lib/currency";
import { formatShortDate } from "@/src/shared/lib/date";
import { Badge } from "@/src/shared/ui/badge";
import { Button } from "@/src/shared/ui/button";
import { cn } from "@/src/shared/lib/cn";

const statusLabels: Record<PrestamoStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  completed: "Pagado",
};

const statusVariants: Record<PrestamoStatus, "secondary" | "outline" | "default"> = {
  pending: "secondary",
  partial: "outline",
  completed: "default",
};

export function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<PrestamoType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<PrestamoStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editPrestamo, setEditPrestamo] = useState<Prestamo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrestamos();
      setPrestamos(data);
    } catch (err) {
      console.error("Error loading prestamos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = prestamos;
    if (filterType !== "all") list = list.filter((p) => p.type === filterType);
    if (filterStatus !== "all") list = list.filter((p) => p.status === filterStatus);
    return list;
  }, [prestamos, filterType, filterStatus]);

  // Summary
  const summary = useMemo(() => {
    const active = prestamos.filter((p) => p.status !== "completed");
    const dados = active.filter((p) => p.type === "dado");
    const recibidos = active.filter((p) => p.type === "recibido");

    const totalDado = dados.reduce((s, p) => s + p.amount, 0);
    const paidDado = dados.reduce(
      (s, p) => s + (p.payments ?? []).reduce((ps, pay) => ps + pay.amount, 0),
      0
    );

    const totalRecibido = recibidos.reduce((s, p) => s + p.amount, 0);
    const paidRecibido = recibidos.reduce(
      (s, p) => s + (p.payments ?? []).reduce((ps, pay) => ps + pay.amount, 0),
      0
    );

    return {
      porCobrar: totalDado - paidDado,
      porPagar: totalRecibido - paidRecibido,
      totalDado,
      totalRecibido,
    };
  }, [prestamos]);

  const handleRefresh = () => {
    setEditPrestamo(null);
    load();
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 -mx-4 px-4 md:-mx-8 md:px-8 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Handshake className="h-5 w-5 text-emerald-600" />
            Préstamos
          </h1>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Por cobrar</span>
            </div>
            <p className="text-lg font-bold text-blue-700 tabular-nums">
              {formatCOP(summary.porCobrar)}
            </p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs text-violet-600 font-medium">Por pagar</span>
            </div>
            <p className="text-lg font-bold text-violet-700 tabular-nums">
              {formatCOP(summary.porPagar)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "dado", "recibido"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                filterType === t
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
              )}
            >
              {t === "all" ? "Todos" : t === "dado" ? "Yo presto" : "Me prestan"}
            </button>
          ))}
          <div className="w-px bg-gray-200 dark:bg-slate-600 mx-1" />
          {(["all", "pending", "partial", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                filterStatus === s
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
              )}
            >
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
                <div className="h-2 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Handshake className="h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-400">
              {prestamos.length === 0
                ? "No tienes préstamos registrados"
                : "No hay préstamos con estos filtros"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const payments = p.payments ?? [];
              const totalPaid = payments.reduce((s, pay) => s + pay.amount, 0);
              const progressPct = p.amount > 0 ? (totalPaid / p.amount) * 100 : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => setEditPrestamo(p)}
                  className="w-full text-left rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-2 transition-colors active:bg-gray-50 dark:active:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-lg shrink-0",
                          p.type === "dado" ? "bg-blue-50" : "bg-violet-50"
                        )}>
                          {p.type === "dado" ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-violet-600" />
                          )}
                        </span>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {p.contact_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-8">
                        {formatShortDate(p.start_date)}
                        {p.expected_return_date && (
                          <> — vence {formatShortDate(p.expected_return_date)}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                        {formatCOP(p.amount)}
                      </p>
                      <Badge variant={statusVariants[p.status]} className="mt-1">
                        {statusLabels[p.status]}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progressPct >= 100
                            ? "bg-emerald-500"
                            : progressPct > 0
                              ? p.type === "dado" ? "bg-blue-500" : "bg-violet-500"
                              : "bg-gray-200"
                        )}
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Abonado: {formatCOP(totalPaid)}</span>
                      <span>Pendiente: {formatCOP(Math.max(p.amount - totalPaid, 0))}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AddPrestamoForm open={addOpen} onOpenChange={setAddOpen} onAdded={load} />

      {editPrestamo && (
        <EditPrestamoForm
          key={editPrestamo.id + editPrestamo.updated_at}
          prestamo={editPrestamo}
          open={!!editPrestamo}
          onOpenChange={(open) => {
            if (!open) handleRefresh();
          }}
          onUpdated={handleRefresh}
        />
      )}
    </div>
  );
}
