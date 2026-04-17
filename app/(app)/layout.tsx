import { BottomNav } from "@/src/widgets/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg min-h-dvh pb-20">
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
