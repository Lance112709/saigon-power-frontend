"use client";

export const DEPOSIT_STATUS: Record<string, { label: string; cls: string }> = {
  paid_in_full:          { label: "Paid in full",        cls: "bg-green-100 text-green-800" },
  explained_withholding: { label: "Explained (withheld)", cls: "bg-sky-100 text-sky-800" },
  short_paid:            { label: "Short paid",          cls: "bg-red-100 text-red-700" },
  over_paid:             { label: "Over paid",           cls: "bg-amber-100 text-amber-800" },
  overdue:               { label: "Overdue",             cls: "bg-red-100 text-red-700" },
  awaiting:              { label: "Awaiting deposit",    cls: "bg-slate-100 text-slate-600" },
  not_tracked:           { label: "Not tracked",         cls: "bg-slate-50 text-slate-400 border border-slate-200" },
  unknown:               { label: "—",                   cls: "bg-slate-100 text-slate-500" },
};

export default function DepositStatusBadge({ status, className = "" }: { status?: string | null; className?: string }) {
  const s = DEPOSIT_STATUS[status || "unknown"] ?? DEPOSIT_STATUS.unknown;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls} ${className}`}>
      {s.label}
    </span>
  );
}
