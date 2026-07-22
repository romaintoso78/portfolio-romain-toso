import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

export function Card({ children, className = "", wide = false }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/5 sm:p-7 ${
        wide ? "sm:col-span-2" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
