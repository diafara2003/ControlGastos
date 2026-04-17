export const APP_NAME = "MisCuentas";
export const APP_DESCRIPTION =
  "Tu app de finanzas personales que lee tus correos bancarios";

export const FINANCIAL_SENDERS = [
  "alertasynotificaciones@bancolombia.com.co",
  "notificaciones@nequi.com",
  "alertas@davivienda.com",
  "alertas@bancocajasocial.com",
  "notificaciones@avvillas.com.co",
] as const;

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  TRANSACTIONS: "/transactions",
  CATEGORIES: "/categories",
  SETTINGS: "/settings",
} as const;
