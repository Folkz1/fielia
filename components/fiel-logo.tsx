import Image from "next/image";
import { cn } from "@/lib/utils";

type FielLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10 rounded-lg",
  lg: "h-24 w-24 rounded-2xl",
};

const imageSizes = {
  sm: "40px",
  lg: "96px",
};

export function FielLogo({ className, priority = false, size = "lg" }: FielLogoProps) {
  return (
    <div
      className={cn(
        "relative mx-auto overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl shadow-red-950/30",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src="/images/logo-fiel-ia.png"
        alt="Fiel IA"
        fill
        priority={priority}
        sizes={imageSizes[size]}
        className="object-contain p-1.5"
      />
    </div>
  );
}
