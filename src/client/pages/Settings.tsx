// src/client/pages/Settings.tsx
import { useEffect, useState } from "react";
import { IconRefresh, IconLogout } from "@tabler/icons-react";
import { api, type GmailStatus } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import { CsvImport } from "../components/CsvImport";

export function Settings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.gmail.status().then(setStatus).catch(console.error);
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.gmail.sync();
      const fresh = await api.gmail.status();
      setStatus(fresh);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    await api.auth.logout();
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="bg-surface rounded-xl p-4 flex items-center gap-3">
        {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />}
        <div>
          <p className="text-sm font-medium">{user?.name ?? user?.email}</p>
          <p className="text-xs text-ink-tertiary">{user?.email}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-1">Gmail sync</h2>
        <p className="text-xs text-ink-tertiary mb-3">
          Catches transactions that get emailed to you (some banks send these for
          card payments or bill pay). Most UPI app-to-app transfers aren't
          emailed, so this is a bonus on top of adding transactions manually,
          not a replacement for it.
        </p>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-ink-secondary">Status</span>
          <span className={status?.gmailConnected ? "text-credit" : "text-debit"}>
            {status?.gmailConnected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-ink-secondary">Last synced</span>
          <span className="font-mono text-xs">
            {status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString("en-IN") : "Never"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-ink-secondary">Imported today</span>
          <span className="font-mono">{status?.importedToday ?? 0}</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-surface-tertiary hover:bg-surface-secondary transition-colors disabled:opacity-50"
        >
          <IconRefresh size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync now"}
        </button>
        <p className="text-xs text-ink-tertiary mt-2">
          Syncs automatically every hour. Manual sync limited to once every 15 minutes.
        </p>
      </div>

      <CsvImport onImported={() => {}} />

      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-surface-tertiary text-debit hover:bg-debit/5 transition-colors"
      >
        <IconLogout size={16} />
        Log out
      </button>
    </div>
  );
}
