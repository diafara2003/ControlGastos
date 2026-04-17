import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { RootLayout as AppLayout } from "@/src/app/layouts/RootLayout";
import { APP_NAME, APP_DESCRIPTION } from "@/src/shared/config/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-dvh bg-background text-foreground">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
