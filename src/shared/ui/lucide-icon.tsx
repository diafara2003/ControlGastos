import {
  Repeat,
  ShoppingBag,
  Store,
  Utensils,
  Car,
  Zap,
  ArrowRightLeft,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  Banknote,
  TrendingUp,
  Package,
  Wallet,
  CreditCard,
  Home,
  Briefcase,
  Plane,
  Gift,
  Phone,
  Wifi,
  Shield,
  Baby,
  Dumbbell,
  PawPrint,
  Wrench,
  Landmark,
  CircleDollarSign,
  type LucideProps,
} from "lucide-react";
import { type ComponentType } from "react";

/**
 * Map of kebab-case icon names to Lucide React components.
 * Add entries here when new categories are introduced.
 */
const iconMap: Record<string, ComponentType<LucideProps>> = {
  repeat: Repeat,
  "shopping-bag": ShoppingBag,
  store: Store,
  utensils: Utensils,
  car: Car,
  zap: Zap,
  "arrow-right-left": ArrowRightLeft,
  "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  banknote: Banknote,
  "trending-up": TrendingUp,
  package: Package,
  wallet: Wallet,
  "credit-card": CreditCard,
  home: Home,
  briefcase: Briefcase,
  plane: Plane,
  gift: Gift,
  phone: Phone,
  wifi: Wifi,
  shield: Shield,
  baby: Baby,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  wrench: Wrench,
  landmark: Landmark,
  "circle-dollar-sign": CircleDollarSign,
};

interface LucideIconProps {
  /** kebab-case Lucide icon name, e.g. "shopping-bag" */
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Renders a Lucide icon by its kebab-case name.
 * Falls back to Package if the name is not found in the map.
 */
export function LucideIcon({ name, size = 16, className, color }: LucideIconProps) {
  const Icon = iconMap[name] ?? Package;
  return <Icon size={size} className={className} style={color ? { color } : undefined} />;
}
