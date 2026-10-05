import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">{children}</h3>;
}
