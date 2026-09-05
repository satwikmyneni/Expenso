import { Car, Circle, Clapperboard, HeartPulse, House, Landmark, Plane, ShoppingBag, Utensils, Zap } from "lucide-react";

const icons = { Car, Clapperboard, HeartPulse, House, Landmark, Plane, ShoppingBag, Utensils, Zap };
export function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? Circle;
  return <Icon className={className} />;
}
