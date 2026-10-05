import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-black/20 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-black/20 ${props.className ?? ""}`}
    />
  );
}

export function FormLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-sm text-black/70 dark:text-white/70 ${props.className ?? ""}`} />;
}
