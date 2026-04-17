import { BottomNav } from "@/src/widgets/bottom-nav";
import { AutoSync } from "@/src/features/sync-emails/ui/AutoSync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg min-h-dvh pb-20">
      <AutoSync />
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
