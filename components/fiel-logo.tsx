import Image from "next/image";
import { cn } from "@/lib/utils";

type FielLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10 rounded-lg",
  md: "h-12 w-12 rounded-xl",
  lg: "h-24 w-24 rounded-2xl",
};

const imageSizes = {
  sm: "40px",
  md: "48px",
  lg: "96px",
};

const imagePaddingClasses = {
  sm: "p-0.5",
  md: "p-0.5",
  lg: "p-1.5",
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
        className={cn("object-contain", imagePaddingClasses[size])}
      />
    </div>
  );
}
