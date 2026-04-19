"use client";

import { useState, useEffect } from "react";
import { PiggyBank, Pencil, Check, X, TrendingUp, Sparkles } from "lucide-react";
import { formatCOP } from "@/src/shared/lib/currency";
import { createClient } from "@/src/shared/api/supabase/client";

interface SavingsRecord {
  month: string;
  goal: number;
  actual_savings: number | null;
  met: boolean | null;
}

interface SavingsGoalProps {
  totalIncome: number;
  totalExpenses: number;
  totalBudgets: number; // sum of all category budget limits
  savingsGoal: number | null;
  selectedDate: Date;
  onGoalUpdated: (goal: number | null) => void;
}

export function SavingsGoal({
  totalIncome,
  totalExpenses,
  totalBudgets,
  savingsGoal,
  selectedDate,
  onGoalUpdated,
}: SavingsGoalProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SavingsRecord[]>([]);
  const [suggestedGoal, setSuggestedGoal] = useState<number | null>(null);

  const now = new Date();
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth =
    now.getMonth() === month && now.getFullYear() === year;
  const dayElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysLeft = Math.max(daysInMonth - dayElapsed, 0);

  const budget = savingsGoal != null ? totalIncome - savingsGoal : null;
  const remaining = budget != null ? Math.max(budget - totalExpenses, 0) : null;
  const dailyBudget =
    remaining != null && daysLeft > 0 ? remaining / daysLeft : null;

  const saved = totalIncome - totalExpenses;
  const onTrack = savingsGoal != null ? saved >= savingsGoal : null;

  const avgDailyExpense = dayElapsed > 0 ? totalExpenses / dayElapsed : 0;
  const projectedExpenses = isCurrentMonth
    ? avgDailyExpense * daysInMonth
    : totalExpenses;
  const projectedSavings = totalIncome - projectedExpenses;

  // Budget validation warning
  const budgetPlusSavings =
    savingsGoal != null && totalBudgets > 0
      ? totalBudgets + savingsGoal
      : null;
  const exceedsBudget =
    budgetPlusSavings != null && totalIncome > 0
      ? budgetPlusSavings > totalIncome
      : false;

  // Load history + compute suggestion
  useEffect(() => {
    const loadHistory = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("savings_history")
        .select("month, goal, actual_savings, met")
        .eq("user_id", user.id)
        .order("month", { ascending: false })
        .limit(6);

      if (data && data.length > 0) {
        setHistory(data);
        // Suggest: average of past goals, adjusted up 5% if they met it
        const pastGoals = data.filter((d) => d.goal > 0);
        if (pastGoals.length > 0) {
          const avgGoal =
            pastGoals.reduce((s, d) => s + d.goal, 0) / pastGoals.length;
          const allMet = pastGoals.every((d) => d.met === true);
          setSuggestedGoal(Math.round(allMet ? avgGoal * 1.05 : avgGoal));
        }
      } else if (totalIncome > 0) {
        // No history: suggest 10% of income
        setSuggestedGoal(Math.round(totalIncome * 0.1));
      }
    };
    loadHistory();
  }, [totalIncome]);

  const startEditing = (prefill?: number) => {
    setInputValue(
      prefill != null
        ? String(prefill)
        : savingsGoal != null
          ? String(savingsGoal)
          : suggestedGoal != null
            ? String(suggestedGoal)
            : ""
    );
    setEditing(true);
  };

  const saveGoal = async () => {
    setSaving(true);
    const value = inputValue.replace(/\D/g, "");
    const goal = value ? parseInt(value, 10) : null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && goal != null) {
      // Update profile
      await supabase
        .from("profiles")
        .update({ savings_goal: goal })
        .eq("id", user.id);

      // Upsert savings_history for this month
      await supabase.from("savings_history").upsert(
        {
          user_id: user.id,
          month: monthKey,
          goal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" }
      );
    } else if (user && goal == null) {
      await supabase
        .from("profiles")
        .update({ savings_goal: null })
        .eq("id", user.id);
    }

    onGoalUpdated(goal);
    setEditing(false);
    setSaving(false);
  };

  const cancelEditing = () => setEditing(false);

  const formatInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("es-CO");
  };

  // For past months, show results
  if (!isCurrentMonth) {
    const record = history.find((h) => h.month === monthKey);
    if (!record) return null;

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="h-4 w-4 text-violet-500" />
          <p className="text-xs font-medium text-gray-500 tracking-wide">
            Meta de ahorro
          </p>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-[22px] font-bold text-gray-900 tabular-nums tracking-tight">
            {formatCOP(record.goal)}
          </p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              record.met
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {record.met ? "Cumplida" : "No cumplida"}
          </span>
        </div>
        {record.actual_savings != null && (
          <p className="text-xs text-gray-500 mt-2">
            Ahorraste {formatCOP(Math.max(record.actual_savings, 0))} de{" "}
            {formatCOP(record.goal)}
          </p>
        )}
      </div>
    );
  }

  // No goal set — show proposal
  if (savingsGoal == null && !editing) {
    return (
      <button
        onClick={() => startEditing(suggestedGoal ?? undefined)}
        className="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-5 shadow-sm flex items-center gap-3 transition-colors active:bg-violet-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          {suggestedGoal ? (
            <Sparkles className="h-5 w-5 text-violet-600" />
          ) : (
            <PiggyBank className="h-5 w-5 text-violet-500" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-gray-900">
            {totalIncome > 0
              ? "Tu nómina llegó — define tu meta de ahorro"
              : "Define tu meta de ahorro"}
          </p>
          {suggestedGoal ? (
            <p className="text-xs text-violet-600 mt-0.5 font-medium">
              Sugerido: {formatCOP(suggestedGoal)}{" "}
              <span className="text-gray-400 font-normal">
                ({Math.round((suggestedGoal / Math.max(totalIncome, 1)) * 100)}
                % de tu ingreso)
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              Toca para configurar cuánto quieres ahorrar este mes
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-violet-500" />
          <p className="text-xs font-medium text-gray-500 tracking-wide">
            Meta de ahorro
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => startEditing()}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatInput(inputValue)}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ej: 2.000.000"
              className="flex-1 text-lg font-bold text-gray-900 border-b-2 border-violet-400 bg-transparent outline-none pb-1 tabular-nums"
              autoFocus
            />
          </div>
          {/* Budget validation */}
          {(() => {
            const val = parseInt(inputValue.replace(/\D/g, ""), 10) || 0;
            if (totalBudgets > 0 && val > 0 && totalBudgets + val > totalIncome) {
              return (
                <p className="text-[11px] text-amber-600 font-medium">
                  Tus presupuestos ({formatCOP(totalBudgets)}) + esta meta
                  superan tus ingresos por{" "}
                  {formatCOP(totalBudgets + val - totalIncome)}
                </p>
              );
            }
            return null;
          })()}
          <div className="flex gap-2">
            <button
              onClick={saveGoal}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors active:bg-violet-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Guardar
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors active:bg-gray-200"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Goal amount and status */}
          <div className="flex items-baseline justify-between">
            <p className="text-[22px] font-bold text-gray-900 tabular-nums tracking-tight">
              {formatCOP(savingsGoal!)}
            </p>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                onTrack
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {onTrack ? "Vas bien" : "Ajusta gastos"}
            </span>
          </div>

          {/* Budget warning */}
          {exceedsBudget && (
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Presupuestos + meta superan ingresos por{" "}
              {formatCOP(budgetPlusSavings! - totalIncome)}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  onTrack ? "bg-violet-500" : "bg-amber-400"
                }`}
                style={{
                  width: `${Math.min(
                    Math.max((saved / savingsGoal!) * 100, 0),
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
              <span>Ahorrado: {formatCOP(Math.max(saved, 0))}</span>
              <span>
                {Math.max(Math.round((saved / savingsGoal!) * 100), 0)}%
              </span>
            </div>
          </div>

          {/* Projections */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {dailyBudget != null && daysLeft > 0 && (
              <div className="rounded-xl bg-violet-50 px-3 py-2.5">
                <p className="text-[10px] text-violet-600 font-medium uppercase tracking-wider">
                  Presupuesto diario
                </p>
                <p className="text-sm font-bold text-violet-700 mt-0.5 tabular-nums">
                  {formatCOP(Math.round(dailyBudget))}
                </p>
                <p className="text-[10px] text-violet-500 mt-0.5">
                  {daysLeft} días restantes
                </p>
              </div>
            )}
            <div
              className={`rounded-xl px-3 py-2.5 ${
                projectedSavings >= savingsGoal!
                  ? "bg-emerald-50"
                  : "bg-rose-50"
              }`}
            >
              <p
                className={`text-[10px] font-medium uppercase tracking-wider ${
                  projectedSavings >= savingsGoal!
                    ? "text-emerald-600"
                    : "text-rose-500"
                }`}
              >
                Proyección
              </p>
              <p
                className={`text-sm font-bold mt-0.5 tabular-nums ${
                  projectedSavings >= savingsGoal!
                    ? "text-emerald-700"
                    : "text-rose-600"
                }`}
              >
                {formatCOP(Math.round(Math.max(projectedSavings, 0)))}
              </p>
              <p
                className={`text-[10px] mt-0.5 ${
                  projectedSavings >= savingsGoal!
                    ? "text-emerald-500"
                    : "text-rose-400"
                }`}
              >
                {projectedSavings >= savingsGoal!
                  ? "Cumplirás la meta"
                  : `Faltan ${formatCOP(Math.round(savingsGoal! - projectedSavings))}`}
              </p>
            </div>
          </div>

          {/* Mini history */}
          {history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  Historial
                </p>
              </div>
              <div className="flex gap-1.5">
                {history.slice(0, 5).reverse().map((h) => (
                  <div
                    key={h.month}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-center ${
                      h.met === true
                        ? "bg-emerald-50"
                        : h.met === false
                          ? "bg-rose-50"
                          : "bg-gray-50"
                    }`}
                  >
                    <p className="text-[9px] text-gray-400 font-medium">
                      {h.month.slice(5)}
                    </p>
                    <p
                      className={`text-[10px] font-bold tabular-nums ${
                        h.met === true
                          ? "text-emerald-600"
                          : h.met === false
                            ? "text-rose-500"
                            : "text-gray-500"
                      }`}
                    >
                      {h.met === true ? "OK" : h.met === false ? "X" : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
