// src/client/components/TransactionRow.tsx
import type { Transaction } from "../lib/api";
import { formatSignedAmount, upiAppPill, formatDate } from "../lib/format";
import { CategoryIcon } from "./CategoryIcon";

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const { text: amountText, className: amountClass } = formatSignedAmount(
    transaction.amount,
    transaction.type
  );
  const pill = upiAppPill(transaction.upiApp);
  const borderClass = transaction.type === "DEBIT" ? "border-debit" : "border-credit";

  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 bg-surface pl-3 pr-4 py-3 text-left",
        "border-l-[3px] rounded-none",
        borderClass,
        onClick ? "hover:bg-surface-secondary transition-colors" : "",
      ].join(" ")}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${transaction.category?.colour ?? "#9CA3AF"}1A` }}
      >
        <CategoryIcon
          name={transaction.category?.icon ?? "dots-circle-horizontal"}
          size={18}
          color={transaction.category?.colour ?? "#9CA3AF"}
          stroke={1.75}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{transaction.merchant}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-ink-tertiary">{formatDate(transaction.date)}</span>
          {pill && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${pill.className}`}>
              {pill.label}
            </span>
          )}
          {!transaction.isReviewed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-light text-brand-dark">
              needs review
            </span>
          )}
        </div>
      </div>

      <span className={`font-mono text-sm font-medium shrink-0 ${amountClass}`}>
        {amountText}
      </span>
    </button>
  );
}
