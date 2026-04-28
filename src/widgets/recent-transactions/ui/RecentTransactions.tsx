"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { ArrowRight, Receipt } from "lucide-react";
import { EmptyState } from "@/src/shared/ui/empty-state";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Receipt className="h-4 w-4 text-violet-500" />
          Ultimos movimientos
        </CardTitle>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-medium text-violet-600 transition-colors rounded-lg px-2 py-1 active:bg-violet-50"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            message="Sin movimientos aun"
            description="Conecta tu correo para empezar a ver tus transacciones"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
