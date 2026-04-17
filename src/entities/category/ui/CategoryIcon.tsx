import { LucideIcon } from "@/src/shared/ui/lucide-icon";

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { container: "h-6 w-6", icon: 12 },
  md: { container: "h-8 w-8", icon: 16 },
  lg: { container: "h-10 w-10", icon: 20 },
};

export function CategoryIcon({ icon, color, size = "md" }: CategoryIconProps) {
  const s = sizes[size];
  return (
    <div
      className={`flex items-center justify-center rounded-full ${s.container}`}
      style={{ backgroundColor: `${color}20` }}
    >
      <LucideIcon name={icon} size={s.icon} color={color} />
    </div>
  );
}
