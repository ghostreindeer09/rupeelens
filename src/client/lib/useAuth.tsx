// src/client/lib/useAuth.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User, ApiError } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        console.error("Failed to fetch current user:", err);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
