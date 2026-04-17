"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TransactionList,
  TransactionFilters,
} from "@/src/widgets/transaction-list";
import { getTransactions, getDistinctCards } from "@/src/entities/transaction";
import { getCategories } from "@/src/entities/category";
import type { Transaction } from "@/src/entities/transaction";
import type { Category } from "@/src/entities/category";
import { EditTransactionForm } from "@/src/features/edit-transaction";
import { AddTransactionForm } from "@/src/features/add-transaction";
import { ExportButton } from "@/src/features/export-csv";
import { Input } from "@/src/shared/ui/input";
import { Button } from "@/src/shared/ui/button";
import { createClient } from "@/src/shared/api/supabase/client";
import { Search, Plus } from "lucide-react";

export function TransactionsPage() {
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
  const [showAddForm, setShowAddForm] = useState(false);

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
        const txns = await getTransactions({
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
  }, [selectedCategory, selectedType, selectedCard, searchQuery]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar comercio, descripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

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

      <TransactionList
        transactions={transactions}
        loading={loading}
        onTransactionClick={(t) => setEditingTx(t)}
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
        />
      )}

      <AddTransactionForm
        categories={categories}
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onAdded={loadData}
      />
    </div>
  );
}
