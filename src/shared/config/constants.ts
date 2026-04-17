export const APP_NAME = "MisCuentas";
export const APP_DESCRIPTION =
  "Tu app de finanzas personales que lee tus correos bancarios";

export const FINANCIAL_SENDERS = [
  "alertasynotificaciones@bancolombia.com.co",
  "alertasynotificaciones@an.notificacionesbancolombia.com",
  "notificacionesbancolombia.com",
  "notificaciones@nequi.com",
  "nequi.com.co",
  "alertas@davivienda.com",
  "notificaciones@davivienda.com",
  "alertas@bancocajasocial.com",
  "notificaciones@avvillas.com.co",
  "alertas@bbva.com.co",
  "notificaciones@scotiabank.com.co",
] as const;

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/transactions",
  CATEGORIES: "/categories",
  SETTINGS: "/settings",
} as const;
