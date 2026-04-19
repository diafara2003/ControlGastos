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
  Landmark,
  ChevronRight,
} from "lucide-react";
import { CreditCardSetupModal } from "@/src/features/credit-card-setup";
import { getBankBrand } from "@/src/shared/config/bank-brands";
import { Select } from "@/src/shared/ui/select";
import { Input } from "@/src/shared/ui/input";

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
  const [bankAccountsOpen, setBankAccountsOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<{
    id: string; identifier: string; bank_name: string;
    account_type: string; is_tracked: boolean;
    track_expenses: boolean; track_income: boolean; label: string | null;
  }[]>([]);
  const [savingBanks, setSavingBanks] = useState(false);

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

    const [{ data }, { data: cards }, { data: banks }] = await Promise.all([
      supabase
        .from("email_accounts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_credit_cards")
        .select("bank_name, product_type")
        .order("bank_name"),
      supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at"),
    ]);
    if (data) setEmailAccounts(data as EmailAccount[]);
    if (cards) setUserCards(cards);
    if (banks) setBankAccounts(banks);
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

      {/* Bank accounts - accordion */}
      {bankAccounts.length > 0 && (
        <Card>
          <button
            onClick={() => setBankAccountsOpen(!bankAccountsOpen)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-gray-700" />
              <span className="text-sm font-semibold text-gray-900">Cuentas bancarias</span>
              <span className="text-[10px] text-gray-400">({bankAccounts.length})</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${bankAccountsOpen ? "rotate-90" : ""}`} />
          </button>
          {bankAccountsOpen && (
          <CardContent className="space-y-3 pt-0">
            {bankAccounts.map((acc) => {
              const brand = getBankBrand(acc.bank_name);
              return (
                <div key={acc.id} className="rounded-lg border border-gray-200 p-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: brand.bgColor, color: brand.textColor }}
                    >
                      {brand.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        *{acc.identifier}
                        <span className="text-xs text-gray-400 font-normal ml-1.5">
                          {brand.name}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500">Nombre</label>
                      <Input
                        value={acc.label ?? ""}
                        onChange={(e) =>
                          setBankAccounts((prev) =>
                            prev.map((a) => a.id === acc.id ? { ...a, label: e.target.value } : a)
                          )
                        }
                        placeholder="Ej: Cuenta principal"
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">Tipo</label>
                      <Select
                        value={acc.account_type}
                        onChange={(e) =>
                          setBankAccounts((prev) =>
                            prev.map((a) => a.id === acc.id ? { ...a, account_type: e.target.value } : a)
                          )
                        }
                        className="text-sm h-8"
                      >
                        <option value="savings">Ahorros</option>
                        <option value="credit">Crédito</option>
                        <option value="other">Otra</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={acc.is_tracked}
                        onChange={(e) =>
                          setBankAccounts((prev) =>
                            prev.map((a) => a.id === acc.id ? { ...a, is_tracked: e.target.checked } : a)
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                      />
                      <span className="text-xs text-gray-700">Incluir en indicadores</span>
                    </label>
                    {acc.is_tracked && (
                      <div className="ml-5 flex gap-4">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={acc.track_expenses}
                            onChange={(e) =>
                              setBankAccounts((prev) =>
                                prev.map((a) => a.id === acc.id ? { ...a, track_expenses: e.target.checked } : a)
                              )
                            }
                            className="h-3 w-3 rounded border-gray-300 text-rose-500"
                          />
                          <span className="text-[11px] text-gray-600">Gastos</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={acc.track_income}
                            onChange={(e) =>
                              setBankAccounts((prev) =>
                                prev.map((a) => a.id === acc.id ? { ...a, track_income: e.target.checked } : a)
                              )
                            }
                            className="h-3 w-3 rounded border-gray-300 text-emerald-500"
                          />
                          <span className="text-[11px] text-gray-600">Ingresos</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <Button
              onClick={async () => {
                setSavingBanks(true);
                const supabase = createClient();
                for (const acc of bankAccounts) {
                  await supabase.from("bank_accounts").update({
                    label: acc.label || `Cuenta *${acc.identifier}`,
                    account_type: acc.account_type,
                    is_tracked: acc.is_tracked,
                    track_expenses: acc.track_expenses,
                    track_income: acc.track_income,
                  }).eq("id", acc.id);
                }
                setSavingBanks(false);
                window.dispatchEvent(new CustomEvent("bank-accounts-updated"));
              }}
              disabled={savingBanks}
              className="w-full"
            >
              {savingBanks ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardContent>
          )}
        </Card>
      )}

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
              Los correos se sincronizan al abrir la app y cuando vuelves a ella.
              También puedes forzar una sincronización manual.
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
