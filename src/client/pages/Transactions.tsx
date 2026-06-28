// src/client/pages/Transactions.tsx
import { useEffect, useState } from "react";
import { IconReceipt2, IconPlus } from "@tabler/icons-react";
import { api, type Transaction, type Category, type TxnSource } from "../lib/api";
import { MONTH_NAMES } from "../lib/format";
import { TransactionRow } from "../components/TransactionRow";
import { EmptyState } from "../components/EmptyState";
import { AddTransactionSheet } from "../components/AddTransactionSheet";

const SOURCE_OPTIONS: { value: TxnSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "GMAIL", label: "Gmail" },
  { value: "MANUAL", label: "Manual" },
  { value: "CSV_IMPORT", label: "CSV import" },
  { value: "RECURRING", label: "Recurring" },
];

export function Transactions() {
  const now = new Date();
  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState<number | "">(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [categoryId, setCategoryId] = useState<string>("");
  const [source, setSource] = useState<TxnSource | "">("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageSize = 25;

  useEffect(() => {
    api.categories.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.transactions
      .list({
        month: month || undefined,
        year,
        category: categoryId || undefined,
        source: source || undefined,
        page,
        pageSize,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, year, categoryId, source, page, refreshKey]);

  function resetPage() {
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <button
          onClick={() => setShowAddSheet(true)}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          <IconPlus size={16} />
          Add transaction
        </button>
      </div>

      <div className="flex flex-wrap gap-2 bg-surface rounded-xl p-3">
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value ? Number(e.target.value) : "");
            resetPage();
          }}
          className="text-sm rounded-lg border border-surface-tertiary bg-surface px-3 py-1.5"
        >
          <option value="">All months</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            resetPage();
          }}
          className="text-sm rounded-lg border border-surface-tertiary bg-surface px-3 py-1.5"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            resetPage();
          }}
          className="text-sm rounded-lg border border-surface-tertiary bg-surface px-3 py-1.5"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as TxnSource | "");
            resetPage();
          }}
          className="text-sm rounded-lg border border-surface-tertiary bg-surface px-3 py-1.5"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-tertiary">Loading...</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={IconReceipt2}
          description="No transactions match these filters."
          actionLabel="Clear filters"
          onAction={() => {
            setMonth("");
            setCategoryId("");
            setSource("");
            resetPage();
          }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-1.5 rounded-xl overflow-hidden">
            {items.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-ink-secondary pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-surface-tertiary disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-surface-tertiary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showAddSheet && (
        <AddTransactionSheet
          categories={categories}
          onClose={() => setShowAddSheet(false)}
          onCreated={() => {
            setShowAddSheet(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
