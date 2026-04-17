import { SupabaseProvider } from "../providers/SupabaseProvider";
import { ServiceWorkerRegistration } from "../providers/ServiceWorkerRegistration";
import { ThemeProvider } from "../providers/ThemeProvider";

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SupabaseProvider>
        <ServiceWorkerRegistration />
        {children}
      </SupabaseProvider>
    </ThemeProvider>
  );
}
