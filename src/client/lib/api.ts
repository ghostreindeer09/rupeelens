// src/client/lib/api.ts
//
// Typed fetch wrapper. Every call automatically:
//   - sends credentials: "include" so the httpOnly rl_session cookie
//     is attached (required since the API and frontend may be on
//     different ports/origins in dev)
//   - reads the rl_csrf cookie and echoes it as X-CSRF-Token on any
//     state-changing request (POST/PUT/DELETE), matching the
//     double-submit pattern the backend's requireCsrf middleware expects
//   - throws a typed ApiError with the server's error message on
//     non-2xx responses, so callers can catch and display it directly

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path, API_BASE);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {} } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  // Attach CSRF token on any state-changing request — matches the
  // backend's double-submit cookie check.
  if (method !== "GET") {
    const csrfToken = readCookie("rl_csrf");
    if (csrfToken) finalHeaders["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    credentials: "include", // send the httpOnly session cookie
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      isJson && typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, isJson ? (payload as any).details : undefined);
  }

  return payload as T;
}

// --- Types mirroring the Prisma schema, trimmed to what the client needs ---

export type TxnType = "DEBIT" | "CREDIT";
export type TxnSource = "GMAIL" | "MANUAL" | "CSV_IMPORT" | "RECURRING";
export type UpiApp = "PHONEPE" | "GPAY" | "PAYTM" | "AMAZON_PAY" | "CRED" | "OTHER";

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  colour: string;
  isSystem: boolean;
}

export interface Transaction {
  id: string;
  amount: string; // Prisma Decimal serialises as string over JSON
  type: TxnType;
  merchant: string;
  note: string | null;
  date: string;
  categoryId: string | null;
  category: Category | null;
  accountId: string | null;
  source: TxnSource;
  upiApp: UpiApp | null;
  isReviewed: boolean;
  isRecurring: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  gmailConnected: boolean;
  gmailSyncedAt: string | null;
}

export interface AnalyticsSummary {
  month: number;
  year: number;
  income: number;
  spend: number;
  savings: number;
  transactionCount: number;
}

export interface CategorySpend {
  categoryId: string | null;
  categoryName: string;
  colour: string;
  icon: string;
  total: number;
  count: number;
}

export interface TrendPoint {
  month: number;
  year: number;
  income: number;
  spend: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  limitAmount: string;
  month: number;
  year: number;
  spentSoFar: number;
}

export interface GmailStatus {
  gmailConnected: boolean;
  lastSyncedAt: string | null;
  importedToday: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- API surface ---

export const api = {
  auth: {
    me: () => request<User>("/auth/me"),
    logout: () => request<{ success: true }>("/auth/logout", { method: "POST" }),
    googleLoginUrl: () => `${API_BASE}/auth/google`,
  },

  transactions: {
    list: (params: {
      month?: number;
      year?: number;
      category?: string;
      source?: TxnSource;
      page?: number;
      pageSize?: number;
    }) => request<PaginatedResponse<Transaction>>("/api/transactions", { query: params }),

    create: (data: {
      amount: number;
      type: TxnType;
      merchant: string;
      note?: string;
      date: string;
      categoryId?: string;
      accountId?: string;
    }) => request<Transaction>("/api/transactions", { method: "POST", body: data }),

    update: (
      id: string,
      data: { note?: string; categoryId?: string | null; accountId?: string | null; isReviewed?: boolean }
    ) => request<Transaction>(`/api/transactions/${id}`, { method: "PUT", body: data }),

    remove: (id: string) =>
      request<{ success: true }>(`/api/transactions/${id}`, { method: "DELETE" }),

    importCsv: async (csvText: string) => {
      const csrfToken = (() => {
        const match = document.cookie.match(/(?:^|; )rl_csrf=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : null;
      })();

      const res = await fetch(buildUrl("/api/transactions/import/csv"), {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
        body: csvText,
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new ApiError(payload?.error ?? `Import failed (${res.status})`, res.status, payload?.details);
      }
      return payload as { imported: number; failed: number; errors: { row: number; message: string }[] };
    },
  },

  categories: {
    list: () => request<Category[]>("/api/categories"),
    create: (data: { name: string; icon: string; colour: string }) =>
      request<Category>("/api/categories", { method: "POST", body: data }),
    update: (id: string, data: Partial<{ name: string; icon: string; colour: string }>) =>
      request<Category>(`/api/categories/${id}`, { method: "PUT", body: data }),
    remove: (id: string) => request<{ success: true }>(`/api/categories/${id}`, { method: "DELETE" }),
  },

  analytics: {
    summary: (params: { month?: number; year?: number }) =>
      request<AnalyticsSummary>("/api/analytics/summary", { query: params }),
    byCategory: (params: { month?: number; year?: number }) =>
      request<CategorySpend[]>("/api/analytics/by-category", { query: params }),
    trend: (params: { months?: number }) =>
      request<TrendPoint[]>("/api/analytics/trend", { query: params }),
  },

  budgets: {
    list: (params: { month: number; year: number }) =>
      request<Budget[]>("/api/budgets", { query: params }),
    create: (data: { categoryId: string; limitAmount: number; month: number; year: number }) =>
      request<Budget>("/api/budgets", { method: "POST", body: data }),
    update: (id: string, data: { limitAmount: number }) =>
      request<Budget>(`/api/budgets/${id}`, { method: "PUT", body: data }),
    remove: (id: string) => request<{ success: true }>(`/api/budgets/${id}`, { method: "DELETE" }),
  },

  gmail: {
    status: () => request<GmailStatus>("/api/gmail/status"),
    sync: () => request<{ imported: number; fetched: number }>("/api/gmail/sync", { method: "POST" }),
  },
};
