import { cn } from "@/src/shared/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600",
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
