interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-6 w-6 text-sm",
  md: "h-8 w-8 text-base",
  lg: "h-10 w-10 text-lg",
};

export function CategoryIcon({ icon, color, size = "md" }: CategoryIconProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full ${sizes[size]}`}
      style={{ backgroundColor: `${color}20` }}
    >
      {icon}
    </div>
  );
}
