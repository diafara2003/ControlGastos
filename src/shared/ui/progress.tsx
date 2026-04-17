import { cn } from "@/src/shared/lib/cn";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-gray-200", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          clamped >= 100
            ? "bg-red-500"
            : clamped >= 80
              ? "bg-amber-500"
              : "bg-emerald-500",
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
