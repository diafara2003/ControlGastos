"use client";

import { useState } from "react";
import { Button } from "@/src/shared/ui/button";
import { Input } from "@/src/shared/ui/input";
import { Spinner } from "@/src/shared/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/dialog";
import { Mail, HelpCircle, AlertCircle } from "lucide-react";

interface ConnectEmailFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function ConnectEmailForm({
  open,
  onOpenChange,
  onConnected,
}: ConnectEmailFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const isGmail = domain === "gmail.com" || domain === "googlemail.com";
  const isMicrosoft = ["outlook.com", "hotmail.com", "live.com"].includes(domain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/emails/connect-imap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          imapHost: imapHost || undefined,
          imapPort: imapPort ? parseInt(imapPort) : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmail("");
        setPassword("");
        onConnected();
        onOpenChange(false);
      } else {
        setError(data.error ?? "Error al conectar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conectar correo
          </DialogTitle>
        </DialogHeader>

        {/* Microsoft notice */}
        {isMicrosoft && (
          <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Outlook/Hotmail no soporta contraseñas de app para IMAP.</p>
              <p className="mt-1">
                Si iniciaste sesión con Microsoft, tus correos se sincronizarán
                automáticamente. Si no, usa Gmail para conectar tu correo.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <Input
              type="email"
              placeholder="tu@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {!isMicrosoft && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Contraseña de aplicación
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {showHelp && (
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 space-y-2">
                  <p className="font-medium">¿Qué es una contraseña de aplicación?</p>
                  <p>
                    Es una contraseña especial que permite a apps externas acceder a
                    tu correo sin usar tu contraseña principal.
                  </p>
                  {isGmail && (
                    <div className="space-y-1">
                      <p className="font-medium">Para Gmail:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Ve a myaccount.google.com</li>
                        <li>Seguridad → Verificación en 2 pasos (activar si no está)</li>
                        <li>Seguridad → Contraseñas de aplicación</li>
                        <li>Nombre: &quot;MisCuentas&quot; → Crear</li>
                        <li>Copia la contraseña de 16 caracteres</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced: custom IMAP */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showAdvanced ? "Ocultar" : "Configuración IMAP avanzada"}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Servidor IMAP</label>
                    <Input
                      placeholder="imap.gmail.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Puerto</label>
                    <Input
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {!isMicrosoft && (
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Verificando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
