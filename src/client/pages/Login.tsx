// src/client/pages/Login.tsx
import { api } from "../lib/api";

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <div className="bg-surface rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="font-mono text-2xl font-semibold text-brand-dark mb-2">RupeeLens</h1>
        <p className="text-sm text-ink-secondary mb-6">
          Track every rupee you send or receive — by hand in seconds, or
          caught automatically when your bank emails a receipt.
        </p>
        <a
          href={api.auth.googleLoginUrl()}
          className="block w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}
