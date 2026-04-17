"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { Button } from "@/src/shared/ui/button";
import { Badge } from "@/src/shared/ui/badge";
import { ConnectEmailButton } from "@/src/features/connect-email";
import { useAuth } from "@/src/features/auth";
import { createClient } from "@/src/shared/api/supabase/client";
import type { EmailAccount } from "@/src/entities/email-account";
import { Spinner } from "@/src/shared/ui/spinner";
import { formatDate } from "@/src/shared/lib/date";
import { useTheme } from "@/src/app/providers/ThemeProvider";
import { Switch } from "@/src/shared/ui/switch";
import { ExportButton } from "@/src/features/export-csv";
import { PushNotificationToggle } from "@/src/features/push-notifications";
import {
  LogOut,
  RefreshCw,
  Mail,
  Trash2,
  CheckCircle,
  AlertCircle,
  Moon,
  Download,
} from "lucide-react";

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700">Modo oscuro</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  );
}

export function SettingsPage() {
  const { signOut, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadAccounts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setEmailAccounts(data as EmailAccount[]);
    setLoadingAccounts(false);
  }, []);

  useEffect(() => {
    loadAccounts();

    // Check URL params for OAuth results
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      setToast({
        type: "success",
        message: `${success === "gmail" ? "Gmail" : "Outlook"} conectado correctamente`,
      });
    } else if (error) {
      setToast({
        type: "error",
        message: `Error al conectar: ${error}`,
      });
    }
  }, [loadAccounts, searchParams]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(
          `Sincronizado: ${data.totalCreated ?? 0} nuevas transacciones`
        );
        loadAccounts(); // Refresh to show updated last_sync_at
      } else {
        setSyncResult(`Error: ${data.error ?? "Error desconocido"}`);
      }
    } catch {
      setSyncResult("Error de conexión al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    const supabase = createClient();
    await supabase.from("email_accounts").delete().eq("id", accountId);
    setEmailAccounts((prev) => prev.filter((a) => a.id !== accountId));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
            toast.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Email accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Cuentas de correo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAccounts ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <>
              {emailAccounts.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  No hay cuentas conectadas. Conecta tu correo para empezar a
                  leer tus notificaciones bancarias.
                </p>
              ) : (
                <div className="space-y-2">
                  {emailAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            acc.provider === "gmail"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {acc.email}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={acc.is_active ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {acc.provider === "gmail" ? "Gmail" : "Outlook"}
                            </Badge>
                            {acc.last_sync_at && (
                              <span className="text-[10px] text-gray-400">
                                Sync: {formatDate(acc.last_sync_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDisconnect(acc.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <ConnectEmailButton provider="gmail" />
                <ConnectEmailButton provider="outlook" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual sync */}
      {emailAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sincronización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Los correos se sincronizan automáticamente cada 6 horas. También
              puedes sincronizar manualmente.
            </p>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar ahora
                </>
              )}
            </Button>
            {syncResult && (
              <p className="text-sm text-center text-gray-600">{syncResult}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appearance & Data */}
      <Card>
        <CardHeader>
          <CardTitle>Apariencia y datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemeToggle />
          <PushNotificationToggle />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Exportar datos</span>
            </div>
            <ExportButton />
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card>
        <CardContent className="p-4">
          <Button
            variant="destructive"
            onClick={signOut}
            disabled={authLoading}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
