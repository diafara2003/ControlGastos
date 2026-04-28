import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full max-w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 px-4 py-3 text-sm text-gray-900 dark:text-slate-100 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 focus-visible:border-emerald-300 dark:focus-visible:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
