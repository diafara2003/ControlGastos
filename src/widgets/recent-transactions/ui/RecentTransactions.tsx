"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { TransactionCard } from "@/src/entities/transaction";
import type { Transaction } from "@/src/entities/transaction";
import { ChevronRight } from "lucide-react";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Últimos movimientos</CardTitle>
        <Link
          href="/transactions"
          className="flex items-center text-xs text-emerald-600 hover:underline"
        >
          Ver todos
          <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Aún no hay movimientos. Conecta tu correo para empezar.
          </p>
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
