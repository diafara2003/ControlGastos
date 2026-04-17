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
      className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-100", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          clamped >= 100
            ? "bg-gradient-to-r from-red-400 to-red-500"
            : clamped >= 80
              ? "bg-gradient-to-r from-amber-400 to-amber-500"
              : "bg-gradient-to-r from-emerald-400 to-emerald-500",
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
