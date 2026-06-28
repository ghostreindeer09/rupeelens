// src/client/pages/Landing.tsx
//
// Marketing/signup page shown to logged-out visitors before the login
// screen. Honest positioning: manual entry is the core flow, Gmail sync
// is a bonus — this reflects the real pivot made after discovering most
// UPI apps (Paytm especially) don't email transaction confirmations.

import { useNavigate } from "react-router-dom";
import {
  IconPlus,
  IconRefresh,
  IconChartPie,
  IconShieldLock,
  IconBolt,
  IconDeviceMobile,
} from "@tabler/icons-react";
import { api } from "../lib/api";
import { CategoryIcon } from "../components/CategoryIcon";

function MockTransactionRow({
  merchant,
  amount,
  type,
  icon,
  colour,
  time,
}: {
  merchant: string;
  amount: string;
  type: "DEBIT" | "CREDIT";
  icon: string;
  colour: string;
  time: string;
}) {
  const borderClass = type === "DEBIT" ? "border-debit" : "border-credit";
  const amountClass = type === "DEBIT" ? "text-debit" : "text-credit";
  const sign = type === "DEBIT" ? "−" : "+";
  return (
    <div className={`flex items-center gap-3 bg-surface pl-3 pr-4 py-3 border-l-[3px] ${borderClass}`}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${colour}1A` }}
      >
        <CategoryIcon name={icon} size={18} color={colour} stroke={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{merchant}</p>
        <p className="text-xs text-ink-tertiary mt-0.5">{time}</p>
      </div>
      <span className={`font-mono text-sm font-medium shrink-0 ${amountClass}`}>
        {sign}₹{amount}
      </span>
    </div>
  );
}

const FEATURES = [
  {
    icon: IconBolt,
    title: "Log a payment in seconds",
    body: "Amount, who it went to, done. No bank linking, no waiting for an email that may never come.",
  },
  {
    icon: IconChartPie,
    title: "See where it actually goes",
    body: "Every rupee sorted into categories automatically — food, transport, rent — so patterns show up without spreadsheets.",
  },
  {
    icon: IconRefresh,
    title: "Gmail catches the rest",
    body: "Some banks and bill payments do send email receipts. RupeeLens quietly imports those too, as a bonus on top of manual entry.",
  },
  {
    icon: IconShieldLock,
    title: "Built read-only, on purpose",
    body: "No bank login, no SMS reading, no payments capability. RupeeLens only ever reads what you give it — nothing more.",
  },
];

const STEPS = [
  {
    title: "Add it in seconds",
    body: "Just paid for chai, rent, or a cab? Tap once, type the amount and who it went to. That's the whole flow.",
  },
  {
    title: "Or let Gmail catch some",
    body: "Connect Gmail and RupeeLens quietly picks up anything your bank or a biller actually emails you — a bonus, not a requirement.",
  },
  {
    title: "Watch your month take shape",
    body: "Income, spend, and savings update live. Every transaction lands in a category automatically, so the picture builds itself.",
  },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-secondary font-sans text-ink">
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="font-mono text-lg font-semibold tracking-tight text-brand-dark">
          RupeeLens
        </span>
        <button
          onClick={() => navigate("/login")}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-surface-tertiary hover:bg-surface transition-colors"
        >
          Log in
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="font-mono text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-ink">
            Every rupee,
            <br />
            <span className="text-brand-dark">accounted for.</span>
          </h1>
          <p className="text-base text-ink-secondary mt-5 max-w-md">
            Most UPI apps never email you a receipt. RupeeLens doesn't wait for
            one — log a payment in seconds, and watch your spending sort
            itself into place.
          </p>
          <div className="flex items-center gap-3 mt-7">
            <a
              href={api.auth.googleLoginUrl()}
              className="text-sm font-medium px-5 py-3 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
            >
              Start tracking — it's free
            </a>
            <span className="text-xs text-ink-tertiary">No card. No bank login.</span>
          </div>
        </div>

        {/* Signature element: a real mock of the actual product UI */}
        <div className="flex flex-col gap-1.5 rounded-xl overflow-hidden shadow-sm">
          <MockTransactionRow
            merchant="Swiggy"
            amount="340"
            type="DEBIT"
            icon="tools-kitchen-2"
            colour="#F59E0B"
            time="Today, 8:42 PM"
          />
          <MockTransactionRow
            merchant="Salary — June"
            amount="58,000"
            type="CREDIT"
            icon="building-bank"
            colour="#22C55E"
            time="Yesterday, 10:03 AM"
          />
          <MockTransactionRow
            merchant="Ramu Tea Stall"
            amount="20"
            type="DEBIT"
            icon="tools-kitchen-2"
            colour="#F59E0B"
            time="Yesterday, 4:15 PM"
          />
          <MockTransactionRow
            merchant="Uber"
            amount="186"
            type="DEBIT"
            icon="car"
            colour="#10B981"
            time="2 days ago"
          />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-surface-tertiary">
        <h2 className="text-sm font-semibold text-ink-tertiary uppercase tracking-wide mb-8">
          What you get
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-light/40 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-brand-dark" stroke={1.75} />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">{title}</h3>
                <p className="text-sm text-ink-secondary">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-surface-tertiary">
        <h2 className="text-sm font-semibold text-ink-tertiary uppercase tracking-wide mb-8">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, idx) => (
            <div key={step.title}>
              <span className="font-mono text-3xl font-semibold text-brand-light">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h3 className="text-base font-semibold mt-2 mb-1.5">{step.title}</h3>
              <p className="text-sm text-ink-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-surface-tertiary text-center">
        <IconDeviceMobile size={28} className="text-ink-tertiary mx-auto mb-4" stroke={1.5} />
        <h2 className="text-2xl font-semibold mb-2">Start in under a minute.</h2>
        <p className="text-sm text-ink-secondary mb-6">
          Sign in with Google. No setup, no bank credentials, no waiting.
        </p>
        <a
          href={api.auth.googleLoginUrl()}
          className="inline-block text-sm font-medium px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          Continue with Google
        </a>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-ink-tertiary">
        RupeeLens — read-only by design.
      </footer>
    </div>
  );
}
