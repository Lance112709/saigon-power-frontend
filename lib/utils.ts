import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for a deal: "Business Name - Deal Name" when both exist, otherwise whichever is set. */
export function dealLabel(d: { deal_name?: string | null; business_name?: string | null } | null | undefined, fallback = "Unnamed Deal"): string {
  const biz = (d?.business_name || "").trim();
  const name = (d?.deal_name || "").trim();
  if (biz && name) return `${biz} - ${name}`;
  return biz || name || fallback;
}
