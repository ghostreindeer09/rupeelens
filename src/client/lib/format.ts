// src/client/lib/format.ts

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatAmount(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return inrFormatter.format(n);
}

export function formatSignedAmount(amount: number | string, type: "DEBIT" | "CREDIT") {
  const formatted = formatAmount(amount);
  if (type === "DEBIT") {
    return { text: `−${formatted}`, className: "text-debit" };
  }
  return { text: `+${formatted}`, className: "text-credit" };
}

const UPI_APP_STYLES: Record<string, string> = {
  PHONEPE: "bg-purple-100 text-purple-700",
  GPAY: "bg-blue-100 text-blue-700",
  PAYTM: "bg-sky-100 text-sky-700",
  AMAZON_PAY: "bg-orange-100 text-orange-700",
  CRED: "bg-zinc-200 text-zinc-700",
  OTHER: "bg-ink-tertiary/20 text-ink-secondary",
};

export function upiAppPill(upiApp: string | null): { label: string; className: string } | null {
  if (!upiApp) return null;
  const labels: Record<string, string> = {
    PHONEPE: "phonepe",
    GPAY: "gpay",
    PAYTM: "paytm",
    AMAZON_PAY: "amazon pay",
    CRED: "cred",
    OTHER: "other",
  };
  return {
    label: labels[upiApp] ?? upiApp.toLowerCase(),
    className: UPI_APP_STYLES[upiApp] ?? UPI_APP_STYLES.OTHER,
  };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
