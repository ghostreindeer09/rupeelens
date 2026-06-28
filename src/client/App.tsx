// src/client/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./lib/useAuth";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Budgets } from "./pages/Budgets";
import { Settings } from "./pages/Settings";

function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-ink-tertiary">
      Loading...
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Root route ("/"): the marketing Landing page for logged-out visitors,
 * the authenticated Layout+Dashboard for logged-in users. Other
 * authenticated routes (/transactions, /budgets, /settings) always
 * require a session and redirect to "/" — which then shows Landing —
 * if there isn't one.
 */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Landing />;
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/transactions"
        element={
          <RequireAuth>
            <Layout>
              <Transactions />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/budgets"
        element={
          <RequireAuth>
            <Layout>
              <Budgets />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Layout>
              <Settings />
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
