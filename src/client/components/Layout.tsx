// src/client/components/Layout.tsx
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import {
  IconLayoutDashboard,
  IconReceipt2,
  IconWallet,
  IconSettings,
} from "@tabler/icons-react";
import { useAuth } from "../lib/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: IconReceipt2 },
  { to: "/budgets", label: "Budgets", icon: IconWallet },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

function NavItems({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const isVertical = orientation === "vertical";
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 transition-colors",
              isVertical
                ? "px-4 py-2.5 rounded-lg text-sm font-medium"
                : "flex-1 flex-col gap-1 py-2 text-[11px] font-medium",
              isActive
                ? isVertical
                  ? "bg-brand-light/40 text-brand-dark"
                  : "text-brand-dark"
                : isVertical
                  ? "text-ink-secondary hover:bg-surface-secondary"
                  : "text-ink-tertiary",
            ].join(" ")
          }
        >
          <Icon size={isVertical ? 20 : 22} stroke={1.75} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-secondary font-sans text-ink">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[200px] bg-surface border-r border-surface-tertiary px-3 py-6">
        <div className="px-3 mb-8">
          <span className="font-mono text-lg font-semibold tracking-tight text-brand-dark">
            RupeeLens
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItems orientation="vertical" />
        </nav>
        {user && (
          <div className="mt-auto px-3 py-3 flex items-center gap-2.5 border-t border-surface-tertiary pt-4">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-ink-tertiary truncate">{user.email}</p>
            </div>
          </div>
        )}
      </aside>

      <main className="md:pl-[200px] pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-surface-tertiary flex items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
        <NavItems orientation="horizontal" />
      </nav>
    </div>
  );
}
