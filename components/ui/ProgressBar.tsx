export function ProgressBar({
  percent,
  tone = "normal",
}: {
  percent: number;
  tone?: "normal" | "danger";
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor = tone === "danger" ? "bg-rose-600" : "bg-emerald-600";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div className={`h-full ${barColor}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
