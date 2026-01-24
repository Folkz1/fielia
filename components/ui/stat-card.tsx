import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: "gold" | "default";
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon, variant = "default", trend }: StatCardProps) {
  return (
    <div className={cn(
      "p-6 rounded-xl transition-smooth hover-lift h-full flex flex-col justify-between",
      variant === "gold" ? "card-gold" : "card-corinthians"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">{title}</h3>
        <div className="text-3xl">{icon}</div>
      </div>
      
      <div className="flex items-baseline gap-3 mb-1">
        <p className={cn(
          "font-heading text-4xl",
          variant === "gold" ? "text-white" : "text-corinthians-gold"
        )}>
          {value}
        </p>
        {trend && (
          <span className={cn(
            "text-sm font-semibold",
            trend.isPositive ? "text-green-400" : "text-red-400"
          )}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      
      {subtitle && (
        <p className="text-sm text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}
