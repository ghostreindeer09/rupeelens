// src/client/pages/Budgets.tsx
import { useEffect, useState } from "react";
import { IconWallet, IconPlus, IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { api, type Budget, type Category, ApiError } from "../lib/api";
import { formatAmount, MONTH_NAMES } from "../lib/format";
import { EmptyState } from "../components/EmptyState";
import { CategoryIcon } from "../components/CategoryIcon";

function BudgetRow({ budget, onDelete }: { budget: Budget; onDelete: () => void }) {
  const limit = parseFloat(budget.limitAmount);
  const spent = budget.spentSoFar;
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const isOver = spent > limit;

  return (
    <div className="bg-surface rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${budget.category.colour}1A` }}
          >
            <CategoryIcon name={budget.category.icon} size={16} color={budget.category.colour} stroke={1.75} />
          </div>
          <span className="text-sm font-medium">{budget.category.name}</span>
        </div>
        <button onClick={onDelete} className="text-ink-tertiary hover:text-debit">
          <IconX size={16} />
        </button>
      </div>

      <div className="w-full h-2 rounded-full bg-surface-tertiary overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-debit" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={isOver ? "text-debit font-medium" : "text-ink-secondary"}>
          {formatAmount(spent)} spent
        </span>
        <span className="text-ink-tertiary">of {formatAmount(limit)}</span>
      </div>
    </div>
  );
}

function AddBudgetForm({
  categories,
  existingCategoryIds,
  month,
  year,
  onClose,
  onCreated,
}: {
  categories: Category[];
  existingCategoryIds: string[];
  month: number;
  year: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const available = categories.filter((c) => !existingCategoryIds.includes(c.id));
  const [categoryId, setCategoryId] = useState(available[0]?.id ?? "");
  const [limitAmount, setLimitAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = parseFloat(limitAmount);
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    if (!parsed || parsed <= 0) {
      setError("Enter a valid limit.");
      return;
    }
    setSubmitting(true);
    try {
      await api.budgets.create({ categoryId, limitAmount: parsed, month, year });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create budget.");
    } finally {
      setSubmitting(false);
    }
  }

  if (available.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-4 text-sm text-ink-secondary">
        Every category already has a budget set for this month.
        <button onClick={onClose} className="ml-2 text-brand-dark font-medium">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New budget</h3>
        <button onClick={onClose} className="text-ink-tertiary hover:text-ink">
          <IconX size={16} />
        </button>
      </div>

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="text-sm rounded-lg border border-surface-tertiary px-3 py-2"
      >
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        inputMode="decimal"
        value={limitAmount}
        onChange={(e) => setLimitAmount(e.target.value)}
        placeholder="Monthly limit, e.g. 5000"
        className="font-mono text-sm rounded-lg border border-surface-tertiary px-3 py-2"
      />

      {error && <p className="text-xs text-debit">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add budget"}
      </button>
    </div>
  );
}

export function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        api.budgets.list({ month, year }),
        api.categories.list(),
      ]);
      setBudgets(budgetsRes);
      setCategories(categoriesRes);
    } catch (err) {
      console.error("Failed to load budgets:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function shiftMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  async function handleDelete(id: string) {
    try {
      await api.budgets.remove(id);
      load();
    } catch (err) {
      console.error("Failed to delete budget:", err);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Budgets</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          <IconPlus size={16} />
          New budget
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 bg-surface rounded-xl py-2">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-surface-secondary">
          <IconChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium w-36 text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-surface-secondary">
          <IconChevronRight size={18} />
        </button>
      </div>

      {showAddForm && (
        <AddBudgetForm
          categories={categories}
          existingCategoryIds={budgets.map((b) => b.categoryId)}
          month={month}
          year={year}
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-tertiary">Loading...</div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={IconWallet}
          description="No budgets set for this month yet."
          actionLabel="Set a budget"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {budgets.map((b) => (
            <BudgetRow key={b.id} budget={b} onDelete={() => handleDelete(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
