"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  BarChart3,
  DollarSign,
  PiggyBank,
  Receipt,
} from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";
import { getTransactions } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { startOfMonth, endOfMonth, getMonthName, formatShortDate } from "@/src/shared/lib/date";
import { formatCOP } from "@/src/shared/lib/currency";
import { Button } from "@/src/shared/ui/button";
import { Spinner } from "@/src/shared/ui/spinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CategoryTotal {
  name: string;
  icon: string;
  color: string;
  total: number;
  percent: number;
}

interface MerchantFrequency {
  merchant: string;
  count: number;
  total: number;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function daysElapsed(date: Date): number {
  const now = new Date();
  const isCurrent =
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  return isCurrent ? now.getDate() : daysInMonth(date);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const isCurrentMonth =
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  const goToPreviousMonth = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(selectedDate).toISOString();
      const end = endOfMonth(selectedDate).toISOString();

      const prevDate = new Date(selectedDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevStart = startOfMonth(prevDate).toISOString();
      const prevEnd = endOfMonth(prevDate).toISOString();

      const [txns, prev] = await Promise.all([
        getTransactions({ startDate: start, endDate: end }),
        getTransactions({ startDate: prevStart, endDate: prevEnd }),
      ]);

      setTransactions(txns);
      setPrevTransactions(prev);
    } catch (err) {
      console.error("Error loading report:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for sync events
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, [load]);

  // ---- Derived data ----
  const income = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions]
  );
  const expenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const totalIncome = useMemo(
    () => income.reduce((s, t) => s + t.amount, 0),
    [income]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, t) => s + t.amount, 0),
    [expenses]
  );
  const balance = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Previous month totals
  const prevIncome = useMemo(
    () =>
      prevTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [prevTransactions]
  );
  const prevExpenses = useMemo(
    () =>
      prevTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [prevTransactions]
  );

  // Top 5 expenses
  const topExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [expenses]
  );

  // Expenses by category
  const categoryTotals: CategoryTotal[] = useMemo(() => {
    const map = new Map<
      string,
      { name: string; icon: string; color: string; total: number }
    >();
    for (const t of expenses) {
      const key = t.category?.name ?? "Sin categoria";
      const entry = map.get(key) ?? {
        name: key,
        icon: t.category?.icon ?? "circle",
        color: t.category?.color ?? "#9ca3af",
        total: 0,
      };
      entry.total += t.amount;
      map.set(key, entry);
    }
    const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const total = sorted.reduce((s, c) => s + c.total, 0);
    return sorted.map((c) => ({
      ...c,
      percent: total > 0 ? (c.total / total) * 100 : 0,
    }));
  }, [expenses]);

  // Average daily spending
  const elapsed = daysElapsed(selectedDate);
  const avgDaily = elapsed > 0 ? totalExpenses / elapsed : 0;
  const projectedTotal = avgDaily * daysInMonth(selectedDate);

  // Transactions grouped by category (for accordion)
  const transactionsByCategory = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of expenses) {
      const key = t.category?.name ?? "Sin categoria";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [expenses]);

  // Most frequent merchants (expenses only)
  const topMerchants: MerchantFrequency[] = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of expenses) {
      const key = t.merchant;
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += t.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [expenses]);

  // Month label
  const monthName = getMonthName(selectedDate);
  const year = selectedDate.getFullYear();
  const showYear = year !== new Date().getFullYear();

  // ---- Render ----
  return (
    <div className="space-y-5 pb-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-10 w-10 rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 capitalize tracking-tight">
          Reporte de {monthName}
          {showYear ? ` ${year}` : ""}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`h-10 w-10 rounded-xl ${isCurrentMonth ? "opacity-30" : ""}`}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-400">Cargando reporte...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Receipt className="h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-400">
            No hay transacciones en este mes.
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          {/* ============================================================
              1. Resumen del mes
              ============================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Resumen del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Ingresos</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCOP(totalIncome)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Gastos</p>
                  <p className="text-lg font-bold text-red-500">
                    {formatCOP(totalExpenses)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p
                    className={`text-lg font-bold ${
                      balance >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {formatCOP(balance)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Tasa de ahorro</p>
                  <div className="flex items-center gap-1.5">
                    <PiggyBank
                      className={`h-4 w-4 ${
                        savingsRate >= 0 ? "text-emerald-500" : "text-red-400"
                      }`}
                    />
                    <p
                      className={`text-lg font-bold ${
                        savingsRate >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================
              2. Comparacion con mes anterior
              ============================================================ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                vs. mes anterior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ComparisonRow
                  label="Ingresos"
                  current={totalIncome}
                  previous={prevIncome}
                />
                <ComparisonRow
                  label="Gastos"
                  current={totalExpenses}
                  previous={prevExpenses}
                  invertColor
                />
                <ComparisonRow
                  label="Balance"
                  current={balance}
                  previous={prevIncome - prevExpenses}
                />
              </div>
            </CardContent>
          </Card>

          {/* ============================================================
              3. Gastos por categoria (accordion)
              ============================================================ */}
          {categoryTotals.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  Gastos por categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {categoryTotals.map((cat) => {
                    const isExpanded = expandedCategory === cat.name;
                    const catTransactions = transactionsByCategory.get(cat.name) ?? [];

                    return (
                      <div key={cat.name}>
                        <button
                          onClick={() =>
                            setExpandedCategory(isExpanded ? null : cat.name)
                          }
                          className="w-full text-left py-2.5 transition-colors active:bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                                style={{ backgroundColor: `${cat.color}15` }}
                              >
                                <LucideIcon
                                  name={cat.icon}
                                  size={14}
                                  color={cat.color}
                                />
                              </div>
                              <span className="text-sm text-gray-700 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({catTransactions.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs text-gray-400">
                                {cat.percent.toFixed(1)}%
                              </span>
                              <span className="text-sm font-semibold text-gray-800">
                                {formatCOP(cat.total)}
                              </span>
                              <ChevronRight
                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${cat.percent}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="ml-9 mb-3 space-y-2 border-l-2 pl-3" style={{ borderColor: `${cat.color}40` }}>
                            {catTransactions
                              .sort(
                                (a, b) =>
                                  new Date(b.transaction_date).getTime() -
                                  new Date(a.transaction_date).getTime()
                              )
                              .map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-700 truncate">
                                      {t.merchant}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                      {formatShortDate(t.transaction_date)}
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium text-gray-800 whitespace-nowrap ml-3 tabular-nums">
                                    {formatCOP(t.amount)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================
              4. Top gastos
              ============================================================ */}
          {topExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Top gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topExpenses.map((t, i) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                        {i + 1}
                      </span>
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${t.category?.color ?? "#9ca3af"}15` }}
                      >
                        <LucideIcon
                          name={t.category?.icon ?? "package"}
                          size={14}
                          color={t.category?.color ?? "#9ca3af"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {t.merchant}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatShortDate(t.transaction_date)}
                          {t.category?.name ? ` · ${t.category.name}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-red-500 whitespace-nowrap">
                        -{formatCOP(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================
              5. Comercios mas frecuentes
              ============================================================ */}
          {topMerchants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  Comercios frecuentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topMerchants.map((m, i) => (
                    <div
                      key={m.merchant}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.merchant}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.count} {m.count === 1 ? "transaccion" : "transacciones"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                        {formatCOP(m.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Comparison row
// ---------------------------------------------------------------------------

function ComparisonRow({
  label,
  current,
  previous,
  invertColor = false,
}: {
  label: string;
  current: number;
  previous: number;
  invertColor?: boolean;
}) {
  const change = pctChange(current, previous);
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  // For "Gastos", an increase is bad (red) and decrease is good (green)
  const goodDirection = invertColor ? isNegative : isPositive;
  const badDirection = invertColor ? isPositive : isNegative;

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">
          Anterior: {formatCOP(previous)}
        </p>
      </div>
      <div className="text-right flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-800">
          {formatCOP(current)}
        </p>
        {change !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              goodDirection
                ? "bg-emerald-50 text-emerald-700"
                : badDirection
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-50 text-gray-500"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : isNegative ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="text-xs text-gray-400">--</span>
        )}
      </div>
    </div>
  );
}
