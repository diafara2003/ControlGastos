"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/ui/card";
import { Button } from "@/src/shared/ui/button";
import { Badge } from "@/src/shared/ui/badge";
import { ConnectEmailForm } from "@/src/features/connect-email";
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
  CreditCard,
} from "lucide-react";
import { CreditCardSetupModal } from "@/src/features/credit-card-setup";

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

interface UserInfo {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function SettingsPage() {
  const { signOut, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [userCards, setUserCards] = useState<{ bank_name: string; product_type: string }[]>([]);
  const [showCardModal, setShowCardModal] = useState(false);

  const loadAccounts = useCallback(async () => {
    const supabase = createClient();

    // Load user info
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      setUser({
        email: authUser.email ?? "",
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null,
      });
    }

    const [{ data }, { data: cards }] = await Promise.all([
      supabase
        .from("email_accounts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_credit_cards")
        .select("bank_name, product_type")
        .order("bank_name"),
    ]);
    if (data) setEmailAccounts(data as EmailAccount[]);
    if (cards) setUserCards(cards);
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

      {/* User profile card */}
      {user && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name ?? "Avatar"}
                className="h-12 w-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {user.name && (
                <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              )}
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

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

              <div className="pt-2">
                <Button onClick={() => setShowConnectForm(true)} className="w-full">
                  <Mail className="h-4 w-4" />
                  Conectar correo
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConnectEmailForm
        open={showConnectForm}
        onOpenChange={setShowConnectForm}
        onConnected={() => {
          loadAccounts();
          setToast({ type: "success", message: "Correo conectado correctamente" });
        }}
      />

      {/* Credit cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Tarjetas de crédito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {userCards.length === 0 ? (
            <p className="text-sm text-gray-500 py-1">
              No has configurado tarjetas de crédito.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userCards.map((card) => (
                <Badge key={card.bank_name} variant="secondary" className="text-xs">
                  {card.bank_name}
                  {card.product_type === "bnpl" && " (BNPL)"}
                </Badge>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setShowCardModal(true)}
            className="w-full"
          >
            <CreditCard className="h-4 w-4" />
            {userCards.length > 0 ? "Editar tarjetas" : "Agregar tarjetas"}
          </Button>
        </CardContent>
      </Card>

      <CreditCardSetupModal
        open={showCardModal}
        onComplete={() => {
          setShowCardModal(false);
          loadAccounts();
        }}
      />

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
              Los correos se sincronizan automáticamente cada 5 segundos mientras
              la app está abierta. También puedes forzar una sincronización.
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
