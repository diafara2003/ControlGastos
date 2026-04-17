import { BottomNav } from "@/src/widgets/bottom-nav";
import { AppHeader } from "@/src/widgets/app-header";
import { AutoSync } from "@/src/features/sync-emails/ui/AutoSync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg min-h-dvh pb-20">
      <AutoSync />
      <AppHeader />
      <main className="px-4 pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}
