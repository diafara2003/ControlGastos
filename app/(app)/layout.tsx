import { BottomNav } from "@/src/widgets/bottom-nav";
import { AppHeader } from "@/src/widgets/app-header";
import { Sidebar } from "@/src/widgets/sidebar";
import { AutoSync } from "@/src/features/sync-emails/ui/AutoSync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AutoSync />
      <Sidebar />
      <AppHeader />

      {/* Mobile: centered with header/bottom nav padding */}
      {/* Desktop: offset by sidebar, more width, no header/bottom nav */}
      <main className="mx-auto max-w-lg px-4 pb-20 pt-14 md:ml-60 md:pt-6 md:pb-6 md:max-w-2xl">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
