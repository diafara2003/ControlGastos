export const APP_NAME = "MisCuentas";
export const APP_DESCRIPTION =
  "Tu app de finanzas personales que lee tus correos bancarios";

export const FINANCIAL_SENDERS = [
  // Bancos (dominios para atrapar cualquier remitente)
  "bancolombia.com.co",
  "notificacionesbancolombia.com",
  "nequi.com",
  "nequi.com.co",
  "davivienda.com",
  "bancocajasocial.com",
  "avvillas.com.co",
  "bbva.com.co",
  "scotiabank.com.co",
  "bancodebogota.com",
  "bancodeoccidente.com",
  "bancopopular.com",
  "bancofalabella.com",
  "itau.co",
  "bancoagrario.com",
  "gnbsudameris.com",
  "pichincha.com",
  "finandina.com",
  "serfinanza.com",
  "bancoomeva.com",
  "bancamia.com",
  "colpatria.com",
  // Fintech / BNPL
  "addi.com",
  "soynu.com.co",
  "nu.com.co",
  "rappipay.co",
  "daviplata.com",
  "lulo.bank",
  "movii.co",
  "dale.co",
  "uala.com.co",
] as const;

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/transactions",
  CATEGORIES: "/categories",
  SETTINGS: "/settings",
} as const;
