// Colored pill for a deal's meter type so Residential vs Commercial is visible at a glance.
// Residential = green, Commercial = purple, anything else = neutral slate.
export function meterTypeClasses(meterType?: string | null): string {
  const t = (meterType || "").trim().toLowerCase();
  if (t.startsWith("res")) return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (t.startsWith("com")) return "bg-violet-50 border-violet-200 text-violet-700";
  return "bg-slate-50 border-slate-100 text-slate-600";
}

export default function MeterTypeBadge({ meterType, className = "" }: { meterType?: string | null; className?: string }) {
  if (!meterType) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${meterTypeClasses(meterType)} ${className}`}>
      {meterType}
    </span>
  );
}
