"use client";

import { Card, CardContent } from "@/src/shared/ui/card";
import { Badge } from "@/src/shared/ui/badge";
import { EmailAccountBadge } from "@/src/entities/email-account";
import type { EmailAccount } from "@/src/entities/email-account";
import { formatDate } from "@/src/shared/lib/date";

interface EmailAccountCardProps {
  account: EmailAccount;
}

export function EmailAccountCard({ account }: EmailAccountCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <EmailAccountBadge provider={account.provider} email={account.email} />
        <div className="flex items-center gap-2">
          <Badge variant={account.is_active ? "default" : "secondary"}>
            {account.is_active ? "Activa" : "Inactiva"}
          </Badge>
          {account.last_sync_at && (
            <span className="text-xs text-gray-400">
              Última sync: {formatDate(account.last_sync_at)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
