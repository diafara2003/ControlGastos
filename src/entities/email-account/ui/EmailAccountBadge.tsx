import { Mail } from "lucide-react";
import type { EmailProvider } from "../model/types";

const providerConfig: Record<EmailProvider, { label: string; color: string }> = {
  gmail: { label: "Gmail", color: "text-red-600" },
  outlook: { label: "Outlook", color: "text-blue-600" },
};

interface EmailAccountBadgeProps {
  provider: EmailProvider;
  email: string;
}

export function EmailAccountBadge({ provider, email }: EmailAccountBadgeProps) {
  const config = providerConfig[provider];
  return (
    <div className="flex items-center gap-2">
      <Mail className={`h-4 w-4 ${config.color}`} />
      <span className="text-sm text-gray-700">{email}</span>
      <span className="text-xs text-gray-400">({config.label})</span>
    </div>
  );
}
