"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { Badge } from "@/src/shared/ui/badge";
import { formatCOP } from "@/src/shared/lib/currency";
import { RefreshCw } from "lucide-react";
import { LucideIcon } from "@/src/shared/ui/lucide-icon";

interface Subscription {
  merchant: string;
  avg_amount: number;
  frequency_days: number;
  last_date: string;
  occurrences: number;
  category_name: string;
  category_icon: string;
  category_color: string;
}

interface SubscriptionsListProps {
  subscriptions: Subscription[];
}

function getFrequencyLabel(days: number): string {
  if (days <= 8) return "Semanal";
  if (days <= 16) return "Quincenal";
  if (days <= 35) return "Mensual";
  if (days <= 95) return "Trimestral";
  if (days <= 190) return "Semestral";
  return "Anual";
}

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  if (subscriptions.length === 0) return null;

  const monthlyTotal = subscriptions.reduce((sum, s) => {
    const multiplier =
      s.frequency_days <= 8
        ? 4
        : s.frequency_days <= 16
          ? 2
          : s.frequency_days <= 35
            ? 1
            : s.frequency_days <= 95
              ? 1 / 3
              : s.frequency_days <= 190
                ? 1 / 6
                : 1 / 12;
    return sum + s.avg_amount * multiplier;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Suscripciones detectadas
          </CardTitle>
          <Badge variant="secondary">{formatCOP(Math.round(monthlyTotal))}/mes</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subscriptions.map((sub) => (
          <div
            key={sub.merchant}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <LucideIcon name={sub.category_icon} size={16} color={sub.category_color} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {sub.merchant}
                </p>
                <p className="text-[10px] text-gray-500">
                  {getFrequencyLabel(sub.frequency_days)} · {sub.occurrences} pagos
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
              {formatCOP(sub.avg_amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
