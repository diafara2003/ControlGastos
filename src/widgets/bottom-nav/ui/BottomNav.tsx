"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: Receipt },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-6 py-2.5 min-w-[5rem] text-[11px] transition-all duration-200",
                isActive
                  ? "text-emerald-600"
                  : "text-gray-400 active:text-gray-600"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full bg-emerald-500 animate-nav-indicator" />
              )}
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                isActive && "bg-emerald-50"
              )}>
                <item.icon className={cn(
                  "h-[22px] w-[22px] transition-all duration-200",
                  isActive && "stroke-[2.5]"
                )} />
              </div>
              <span className={cn(
                "transition-all duration-200",
                isActive ? "font-semibold" : "font-normal"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
