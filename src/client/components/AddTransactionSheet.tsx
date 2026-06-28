// src/client/components/AddTransactionSheet.tsx
//
// Per spec: "No modals using position: fixed — use slide-up sheets on
// mobile, inline panels on desktop."

import { useState, type FormEvent } from "react";
import { IconX } from "@tabler/icons-react";
import { api, type Category, ApiError } from "../lib/api";
import { CategoryIcon } from "./CategoryIcon";

interface AddTransactionSheetProps {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export function AddTransactionSheet({ categories, onClose, onCreated }: AddTransactionSheetProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!merchant.trim()) {
      setError("Enter who you paid or received from.");
      return;
    }

    setSubmitting(true);
    try {
      await api.transactions.create({
        amount: parsedAmount,
        type,
        merchant: merchant.trim(),
        date,
        categoryId: categoryId || undefined,
        note: note.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/30 z-40" onClick={onClose} />

      <div
        className={[
          "fixed z-50 bg-surface flex flex-col",
          "inset-x-0 bottom-0 rounded-t-xl max-h-[85vh]",
          "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[420px] md:rounded-xl md:max-h-[90vh]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-tertiary">
          <h2 className="text-base font-semibold">Add transaction</h2>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("DEBIT")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "DEBIT"
                  ? "border-debit bg-debit/10 text-debit"
                  : "border-surface-tertiary text-ink-secondary"
              }`}
            >
              Money out
            </button>
            <button
              type="button"
              onClick={() => setType("CREDIT")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "CREDIT"
                  ? "border-credit bg-credit/10 text-credit"
                  : "border-surface-tertiary text-ink-secondary"
              }`}
            >
              Money in
            </button>
          </div>

          <div>
            <label className="text-xs text-ink-tertiary mb-1 block">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full font-mono text-lg rounded-lg border border-surface-tertiary px-3 py-2"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-ink-tertiary mb-1 block">
              {type === "DEBIT" ? "Paid to" : "Received from"}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Swiggy, Ramesh, Rent"
              className="w-full text-sm rounded-lg border border-surface-tertiary px-3 py-2"
            />
          </div>

          <div>
            <label className="text-xs text-ink-tertiary mb-1 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] ${
                    categoryId === c.id
                      ? "border-brand bg-brand-light/30"
                      : "border-surface-tertiary"
                  }`}
                >
                  <CategoryIcon name={c.icon} size={16} color={c.colour} stroke={1.75} />
                  <span className="truncate w-full text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-tertiary mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm rounded-lg border border-surface-tertiary px-3 py-2"
            />
          </div>

          <div>
            <label className="text-xs text-ink-tertiary mb-1 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
              className="w-full text-sm rounded-lg border border-surface-tertiary px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-debit">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add transaction"}
          </button>
        </form>
      </div>
    </>
  );
}
