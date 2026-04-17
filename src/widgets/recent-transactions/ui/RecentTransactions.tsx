"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { ChevronRight, Receipt, Inbox } from "lucide-react";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-500" />
          Ultimos movimientos
        </CardTitle>
        <Link
          href="/transactions"
          className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg px-2 py-1 hover:bg-emerald-50"
        >
          Ver todos
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-3">
              <Inbox className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Sin movimientos aun</p>
            <p className="text-xs text-gray-300 mt-1">Conecta tu correo para empezar a ver tus transacciones</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
