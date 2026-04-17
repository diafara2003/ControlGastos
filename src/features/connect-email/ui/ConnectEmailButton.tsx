"use client";

import { Button } from "@/src/shared/ui/button";
import { Mail } from "lucide-react";
import type { EmailProvider } from "@/src/entities/email-account";

interface ConnectEmailButtonProps {
  provider: EmailProvider;
}

const config: Record<EmailProvider, { label: string; color: string }> = {
  gmail: { label: "Conectar Gmail", color: "bg-red-600 hover:bg-red-700" },
  outlook: { label: "Conectar Outlook", color: "bg-blue-600 hover:bg-blue-700" },
};

export function ConnectEmailButton({ provider }: ConnectEmailButtonProps) {
  const handleConnect = () => {
    window.location.href = `/api/emails/connect-${provider}`;
  };

  return (
    <Button
      onClick={handleConnect}
      className={`${config[provider].color} text-white`}
    >
      <Mail className="h-4 w-4" />
      {config[provider].label}
    </Button>
  );
}
