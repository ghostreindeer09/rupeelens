// src/client/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconReceipt2, IconRefresh, IconPlus } from "@tabler/icons-react";
import { api, type AnalyticsSummary, type Transaction, type Category } from "../lib/api";
import { formatAmount, MONTH_NAMES } from "../lib/format";
import { TransactionRow } from "../components/TransactionRow";
import { EmptyState } from "../components/EmptyState";
import { AddTransactionSheet } from "../components/AddTransactionSheet";

function StatCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-4 flex-1 min-w-[140px]">
      <p className="text-xs text-ink-tertiary mb-1">{label}</p>
      <p className={`font-mono text-xl font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const now = new Date();

  async function loadData() {
    setLoading(true);
    try {
      const [summaryRes, txnRes, categoriesRes] = await Promise.all([
        api.analytics.summary({}),
        api.transactions.list({ page: 1, pageSize: 8 }),
        api.categories.list(),
      ]);
      setSummary(summaryRes);
      setRecent(txnRes.items);
      setCategories(categoriesRes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.gmail.sync();
      await loadData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-ink-tertiary">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-ink-tertiary">
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Gmail sync catches transactions that get emailed to you. Most UPI apps don't email every payment, so manual entry is still the main way to track."
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-surface-tertiary hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            <IconRefresh size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Gmail"}
          </button>

          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            <IconPlus size={16} />
            Add transaction
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Income" value={formatAmount(summary?.income ?? 0)} valueClassName="text-credit" />
        <StatCard label="Spend" value={formatAmount(summary?.spend ?? 0)} valueClassName="text-debit" />
        <StatCard label="Savings" value={formatAmount(summary?.savings ?? 0)} />
        <StatCard label="Transactions" value={String(summary?.transactionCount ?? 0)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink-secondary mb-3">Recent activity</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={IconReceipt2}
            description="No transactions yet. Add your first one to get started."
            actionLabel="Add transaction"
            onAction={() => setShowAddSheet(true)}
          />
        ) : (
          <div className="flex flex-col gap-1.5 rounded-xl overflow-hidden">
            {recent.map((txn) => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                onClick={() => navigate(`/transactions?highlight=${txn.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddSheet && (
        <AddTransactionSheet
          categories={categories}
          onClose={() => setShowAddSheet(false)}
          onCreated={() => {
            setShowAddSheet(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
