"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  TransactionList,
  TransactionFilters,
} from "@/src/widgets/transaction-list";
import { getTransactions, getDistinctCards } from "@/src/entities/transaction";
import { getCategories } from "@/src/entities/category";
import type { Transaction } from "@/src/entities/transaction";
import type { Category } from "@/src/entities/category";
import { EditTransactionForm } from "@/src/features/edit-transaction";
import { WithdrawalDetailsModal } from "@/src/features/withdrawal-details";
import { AddTransactionForm } from "@/src/features/add-transaction";
import { Input } from "@/src/shared/ui/input";
import { Button } from "@/src/shared/ui/button";
import { createClient } from "@/src/shared/api/supabase/client";
import { useAccountFilter, filterByAccount } from "@/src/shared/context/account-filter";
import { useCycleConfig } from "@/src/shared/context/cycle-config";
import { AccountFilterToggle } from "@/src/shared/ui/account-filter-toggle";
import { Search, Plus, Banknote, ChevronLeft, ChevronRight } from "lucide-react";

export function TransactionsPage() {
  const searchParams = useSearchParams();
  const withdrawalFilter = searchParams.get("filter") === "withdrawals";
  const cycle = useCycleConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<
    "expense" | "income" | null
  >(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [withdrawalTx, setWithdrawalTx] = useState<Transaction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { selectedAccount, accounts: bankAccounts } = useAccountFilter();

  const isCurrent = cycle.isCurrentPeriod(selectedDate);
  const monthName = cycle.periodMonthName(selectedDate);
  const pEnd = cycle.periodEnd(selectedDate);
  const year = pEnd.getFullYear();
  const showYear = year !== new Date().getFullYear();

  const goToPreviousMonth = () => {
    setSelectedDate((prev) => cycle.previousPeriod(prev));
  };
  const goToNextMonth = () => {
    if (isCurrent) return;
    setSelectedDate((prev) => cycle.nextPeriod(prev));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const supabase = createClient();
        const { data } = await supabase.rpc("search_transactions", {
          search_query: searchQuery.trim(),
        });
        setTransactions((data as Transaction[]) ?? []);
      } else {
        const start = cycle.periodStart(selectedDate).toISOString();
        const end = cycle.periodEnd(selectedDate).toISOString();
        const txns = await getTransactions({
          startDate: start,
          endDate: end,
          categoryId: selectedCategory ?? undefined,
          type: selectedType ?? undefined,
          cardLastFour: selectedCard ?? undefined,
        });
        setTransactions(txns);
      }

      const [cats, cardList] = await Promise.all([
        getCategories(),
        getDistinctCards(),
      ]);
      setCategories(cats);
      setCards(cardList);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedType, selectedCard, searchQuery, selectedDate, cycle]);

  useEffect(() => {
    const timer = setTimeout(loadData, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, searchQuery]);

  // Auto-refresh when new transactions are synced
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, [loadData]);

  const handleDeleteMonth = useCallback(async (_year: number, _month: number) => {
    // Use period boundaries from cycle config for the given month
    const refDate = new Date(_year, _month - 1, 15);
    const startDate = cycle.periodStart(refDate).toISOString();
    const endDate = cycle.periodEnd(refDate).toISOString();

    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (error) {
      console.error("Error deleting month transactions:", error);
      return;
    }
    loadData();
  }, [loadData, cycle]);

  const filteredTransactions = useMemo(() => {
    let filtered = filterByAccount(transactions, selectedAccount, bankAccounts);
    if (withdrawalFilter) {
      filtered = filtered.filter(
        (t) =>
          !t.withdrawal_resolved &&
          (t.category?.name === "Retiro cajero" ||
            t.category?.name === "Efectivo" ||
            /cajero|retiro|atm|servibanca/i.test(t.merchant))
      );
    }
    return filtered;
  }, [transactions, selectedAccount, withdrawalFilter]);

  const pendingWithdrawals = useMemo(
    () =>
      filteredTransactions.filter(
        (t) =>
          !t.withdrawal_resolved &&
          (t.category?.name === "Retiro cajero" ||
            t.category?.name === "Efectivo" ||
            /cajero|retiro|atm|servibanca/i.test(t.merchant))
      ),
    [filteredTransactions]
  );

  return (
    <div>
      {/* Sticky header with search and filters */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 pb-3 space-y-3 md:top-0 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {/* Period navigation */}
        {!searchQuery && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700 capitalize min-w-[120px] text-center">
              {monthName}{showYear ? ` ${year}` : ""}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={isCurrent}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-gray-100 ${
                isCurrent ? "opacity-0 pointer-events-none" : ""
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar comercio, descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <AccountFilterToggle />

        {pendingWithdrawals.length > 0 && !withdrawalFilter && (
          <a
            href="/transactions?filter=withdrawals"
            className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 transition-colors active:bg-amber-100"
          >
            <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-medium text-amber-700 flex-1">
              {pendingWithdrawals.length} retiro{pendingWithdrawals.length > 1 ? "s" : ""} sin detallar
            </span>
            <span className="text-[10px] text-amber-500">Ver</span>
          </a>
        )}

        {withdrawalFilter && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Retiros pendientes de detallar
              </span>
            </div>
            <a href="/transactions" className="text-[10px] text-amber-500 underline">
              Ver todos
            </a>
          </div>
        )}

        {!searchQuery && (
          <TransactionFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            cards={cards}
            selectedCard={selectedCard}
            onCardChange={setSelectedCard}
          />
        )}
      </div>

      <div className="mt-4 overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-210px)]">
      <TransactionList
        transactions={filteredTransactions}
        loading={loading}
        onTransactionClick={(t) => {
          setEditingTx(t);
        }}
        onDeleteMonth={handleDeleteMonth}
      />

      {editingTx && (
        <EditTransactionForm
          transaction={editingTx}
          categories={categories}
          open={!!editingTx}
          onOpenChange={(open) => {
            if (!open) setEditingTx(null);
          }}
          onSaved={loadData}
          onDetailWithdrawal={(t) => {
            setEditingTx(null);
            setWithdrawalTx(t);
          }}
        />
      )}

      {withdrawalTx && (
        <WithdrawalDetailsModal
          transaction={withdrawalTx}
          open={!!withdrawalTx}
          onOpenChange={(open) => {
            if (!open) setWithdrawalTx(null);
          }}
          onUpdated={loadData}
        />
      )}

      <AddTransactionForm
        categories={categories}
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onAdded={loadData}
      />
      </div>
    </div>
  );
}
